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
 *
 * Depuis la migration 0026, un horaire est obligatoirement assigné à un
 * membre de l'équipe et doit être compris dans les heures d'ouverture du
 * salon (business_hours, configurées dans Mon établissement).
 */

const weekdayLabels = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

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

  const staffId = formData.get("staff_id");
  const weekdays = formData.getAll("weekday").map(Number);
  const startTime = formData.get("start_time");
  const endTime = formData.get("end_time");
  const slotDuration = Number(formData.get("slot_duration_minutes"));
  const capacity = Number(formData.get("capacity"));

  if (
    typeof staffId !== "string" ||
    !staffId ||
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
        "Sélectionnez un membre de l'équipe, au moins un jour, et remplissez tous les champs correctement.",
    };
  }

  if (endTime <= startTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabase = await createClient();

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("id")
    .eq("id", staffId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (!staffMember) {
    return { error: "Membre de l'équipe introuvable." };
  }

  const { data: businessHours } = await supabase
    .from("business_hours")
    .select("weekday, start_time, end_time")
    .eq("business_id", profile.business_id)
    .in("weekday", weekdays);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  for (const weekday of weekdays) {
    const fitsWithinOpeningHours = (businessHours ?? []).some(
      (h) =>
        h.weekday === weekday &&
        startMinutes >= timeToMinutes(h.start_time) &&
        endMinutes <= timeToMinutes(h.end_time)
    );
    if (!fitsWithinOpeningHours) {
      return {
        error: `L'horaire proposé doit être compris dans les heures d'ouverture du salon pour le ${weekdayLabels[weekday]} (à définir dans Configuration → Mon établissement).`,
      };
    }
  }

  const { error } = await supabase.from("availability_rules").insert(
    weekdays.map((weekday) => ({
      business_id: profile.business_id,
      staff_id: staffId,
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
  revalidatePath("/dashboard/configuration/etablissement");
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
  // Les horaires sont aussi éditables depuis Configuration → Mon établissement.
  revalidatePath("/dashboard/configuration/etablissement");
}

/**
 * Blocage d'une plage horaire (congé, indisponibilité — FR-9.3,
 * US-O14/US-S4). Ouvert au personnel comme au gérant, comme le permet
 * déjà la policy RLS staff_insert_manual_entries.
 *
 * Depuis 0027, un blocage peut viser un membre précis (staff_id) ou toute
 * l'équipe (staff_id null) — la grille de créneaux générée (même
 * découpage que generateSlotsForDate) ne porte alors que sur les horaires
 * du ou des membres concernés. Regroupées par block_group_id pour
 * pouvoir être affichées et supprimées ensemble ; enforce_agenda_capacity
 * et generateSlotsForDate excluent ensuite la capacité du ou des membres
 * bloqués sur ces créneaux exacts.
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

  const staffIdRaw = formData.get("staff_id");
  const staffId =
    typeof staffIdRaw === "string" && staffIdRaw ? staffIdRaw : null;
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

  if (staffId) {
    const { data: staffMember } = await supabase
      .from("staff_members")
      .select("id")
      .eq("id", staffId)
      .eq("business_id", profile.business_id)
      .maybeSingle();
    if (!staffMember) {
      return { error: "Membre de l'équipe introuvable." };
    }
  }

  let rulesQuery = supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time, slot_duration_minutes, capacity, staff_id")
    .eq("business_id", profile.business_id)
    .eq("weekday", weekday);
  if (staffId) {
    rulesQuery = rulesQuery.eq("staff_id", staffId);
  }
  const { data: rules } = await rulesQuery;

  const fromMinutes = timeToMinutes(startTime);
  const toMinutes = timeToMinutes(endTime);
  const blockGroupId = crypto.randomUUID();

  const rows = ((rules ?? []) as AvailabilityRule[]).flatMap((rule) =>
    alignedSlotStartsInRange(rule, fromMinutes, toMinutes).map(
      (startMinutes) => ({
        business_id: profile.business_id as string,
        source: "blokkering" as const,
        block_group_id: blockGroupId,
        staff_id: staffId,
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
