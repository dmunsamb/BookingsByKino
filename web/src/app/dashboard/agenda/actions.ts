"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  canManageBusiness,
  isStaffMember,
} from "@/lib/auth/dal";
import {
  timeToMinutes,
  minutesToTime,
  localSlotToIso,
  alignedSlotStartsInRange,
  type AvailabilityRule,
} from "@/lib/availability";

/**
 * Gestion des créneaux de disponibilité (FR-9.2, US-O13). L'écriture est
 * de toute façon restreinte au gérant côté base de données (policy
 * owner_write_availability_rules) ; on revérifie ici pour renvoyer un
 * message clair plutôt qu'une erreur RLS brute.
 */

export type AvailabilityFormState = { error?: string };

export async function createAvailabilityRule(
  _prevState: AvailabilityFormState,
  formData: FormData
): Promise<AvailabilityFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!canManageBusiness(profile)) {
    return { error: "Seul le gérant peut modifier les horaires." };
  }

  const weekdays = formData.getAll("weekday").map(Number);
  const startTime = formData.get("start_time");
  const endTime = formData.get("end_time");
  const slotDuration = Number(formData.get("slot_duration_minutes"));
  const capacity = Number(formData.get("capacity"));

  if (
    weekdays.length === 0 ||
    weekdays.some((weekday) => Number.isNaN(weekday)) ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !startTime ||
    !endTime ||
    Number.isNaN(slotDuration) ||
    slotDuration <= 0 ||
    Number.isNaN(capacity) ||
    capacity <= 0
  ) {
    return {
      error:
        "Sélectionnez au moins un jour et remplissez tous les champs correctement.",
    };
  }

  if (endTime <= startTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").insert(
    weekdays.map((weekday) => ({
      business_id: profile.business_id,
      weekday,
      start_time: startTime,
      end_time: endTime,
      slot_duration_minutes: slotDuration,
      capacity,
    }))
  );

  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/agenda");
  return {};
}

export async function deleteAvailabilityRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", id);

  revalidatePath("/dashboard/agenda");
}

/**
 * Blocage d'une plage horaire (congé, indisponibilité — FR-9.3,
 * US-O14/US-S4). Ouvert au personnel comme au gérant, comme le permet
 * déjà la policy RLS staff_insert_manual_entries.
 *
 * Crée une ligne "blokkering" par créneau de la grille d'ouverture
 * recouvert par la plage choisie (même découpage que
 * generateSlotsForDate), regroupées par block_group_id pour pouvoir être
 * affichées et supprimées ensemble. get_agenda_capacity (migration 0018)
 * traite ensuite ces créneaux comme indisponibles, quelle que soit la
 * capacité configurée.
 */
export type BlockFormState = { error?: string };

export async function createBlockingEntry(
  _prevState: BlockFormState,
  formData: FormData
): Promise<BlockFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!isStaffMember(profile)) {
    return { error: "Action non autorisée." };
  }

  const date = formData.get("date");
  const startTime = formData.get("start_time");
  const endTime = formData.get("end_time");

  if (
    typeof date !== "string" ||
    !date ||
    typeof startTime !== "string" ||
    !startTime ||
    typeof endTime !== "string" ||
    !endTime
  ) {
    return { error: "Veuillez remplir tous les champs." };
  }
  if (endTime <= startTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabase = await createClient();
  const weekday = new Date(`${date}T12:00:00+01:00`).getDay();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time, slot_duration_minutes, capacity")
    .eq("business_id", profile.business_id)
    .eq("weekday", weekday);

  const fromMinutes = timeToMinutes(startTime);
  const toMinutes = timeToMinutes(endTime);
  const blockGroupId = crypto.randomUUID();

  const rows = ((rules ?? []) as AvailabilityRule[]).flatMap((rule) =>
    alignedSlotStartsInRange(rule, fromMinutes, toMinutes).map(
      (startMinutes) => ({
        business_id: profile.business_id as string,
        source: "blokkering" as const,
        block_group_id: blockGroupId,
        start_time: localSlotToIso(date, minutesToTime(startMinutes)),
        end_time: localSlotToIso(
          date,
          minutesToTime(startMinutes + rule.slot_duration_minutes)
        ),
      })
    )
  );

  if (rows.length === 0) {
    return {
      error:
        "Aucun horaire d'ouverture ne correspond à cette plage — vérifiez vos horaires configurés pour ce jour.",
    };
  }

  const { error } = await supabase.from("agenda_entries").insert(rows);
  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/agenda");
  return {};
}

export async function deleteBlockingGroup(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !isStaffMember(profile)) return;

  const blockGroupId = formData.get("block_group_id");
  if (typeof blockGroupId !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("agenda_entries")
    .delete()
    .eq("block_group_id", blockGroupId);

  revalidatePath("/dashboard/agenda");
}
