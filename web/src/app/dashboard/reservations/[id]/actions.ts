"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";
import { localSlotToIso } from "@/lib/availability";

/**
 * Édition manuelle de la date/du créneau d'une réservation par le gérant
 * uniquement (US-O14). Le service, le nom et le téléphone du client ne se
 * modifient pas ici volontairement : un changement de prestation ou de
 * client, c'est une autre réservation — on annule et on en recrée une.
 * La capacité réelle du nouveau créneau est revérifiée côté base par le
 * trigger enforce_agenda_capacity (0005_enforce_capacity_on_update.sql),
 * exactement comme pour une nouvelle demande client.
 */

export type EditBookingFormState = { error?: string };

export async function updateBooking(
  _prevState: EditBookingFormState,
  formData: FormData
): Promise<EditBookingFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (profile.role !== "owner") {
    return { error: "Seul le gérant peut modifier manuellement une réservation." };
  }

  const id = formData.get("id");
  const date = formData.get("date");
  const slot = formData.get("slot");

  if (
    typeof id !== "string" ||
    typeof date !== "string" ||
    typeof slot !== "string"
  ) {
    return { error: "Veuillez choisir un créneau." };
  }

  const [time, slotDurationRaw] = slot.split("|");
  const slotDurationMinutes = Number(slotDurationRaw);

  if (!time || Number.isNaN(slotDurationMinutes)) {
    return { error: "Créneau invalide, merci de réessayer." };
  }

  const startIso = localSlotToIso(date, time);
  const endDate = new Date(startIso);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + slotDurationMinutes);

  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_entries")
    .update({
      start_time: startIso,
      end_time: endDate.toISOString(),
    })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  if (error) {
    return {
      error:
        "Ce créneau n'est plus disponible ou une erreur est survenue. Merci de réessayer.",
    };
  }

  redirect("/dashboard");
}
