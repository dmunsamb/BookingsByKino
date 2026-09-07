"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";

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
    return { error: "Aucune zaak associée à votre compte." };
  }
  if (profile.role !== "owner") {
    return { error: "Seul le gérant peut modifier les horaires." };
  }

  const weekday = Number(formData.get("weekday"));
  const startTime = formData.get("start_time");
  const endTime = formData.get("end_time");
  const slotDuration = Number(formData.get("slot_duration_minutes"));
  const capacity = Number(formData.get("capacity"));

  if (
    Number.isNaN(weekday) ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !startTime ||
    !endTime ||
    Number.isNaN(slotDuration) ||
    slotDuration <= 0 ||
    Number.isNaN(capacity) ||
    capacity <= 0
  ) {
    return { error: "Veuillez remplir tous les champs correctement." };
  }

  if (endTime <= startTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").insert({
    business_id: profile.business_id,
    weekday,
    start_time: startTime,
    end_time: endTime,
    slot_duration_minutes: slotDuration,
    capacity,
  });

  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/agenda");
  return {};
}

export async function deleteAvailabilityRule(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", id);

  revalidatePath("/dashboard/agenda");
}
