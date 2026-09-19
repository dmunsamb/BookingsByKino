"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";

/**
 * Heures d'ouverture du salon (business_hours, migration 0026) — le
 * concept "quand le salon est ouvert", distinct des horaires PAR membre
 * de l'équipe (availability_rules, page Horaires et capacité) qui eux
 * portent le créneau et la capacité, et doivent rester compris dans ces
 * heures d'ouverture.
 */

export type BusinessHoursFormState = { error?: string };

export async function createBusinessHour(
  _prevState: BusinessHoursFormState,
  formData: FormData
): Promise<BusinessHoursFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!canManageBusiness(profile)) {
    return { error: "Seul le gérant peut modifier les heures d'ouverture." };
  }

  const weekdays = formData.getAll("weekday").map(Number);
  const startTime = formData.get("start_time");
  const endTime = formData.get("end_time");

  if (
    weekdays.length === 0 ||
    weekdays.some((weekday) => Number.isNaN(weekday)) ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !startTime ||
    !endTime
  ) {
    return {
      error: "Sélectionnez au moins un jour et remplissez le début et la fin.",
    };
  }

  if (endTime <= startTime) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("business_hours").insert(
    weekdays.map((weekday) => ({
      business_id: profile.business_id,
      weekday,
      start_time: startTime,
      end_time: endTime,
    }))
  );

  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/configuration/etablissement");
  revalidatePath("/dashboard/agenda");
  return {};
}

export async function deleteBusinessHour(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("business_hours").delete().eq("id", id);

  revalidatePath("/dashboard/configuration/etablissement");
  revalidatePath("/dashboard/agenda");
}
