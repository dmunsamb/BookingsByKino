"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";
import { localSlotToIso } from "@/lib/availability";

/**
 * Édition manuelle d'une réservation par le gérant uniquement (US-O14) :
 * changer le service, la date/le créneau, ou les coordonnées du client.
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
  const serviceId = formData.get("service_id");
  const date = formData.get("date");
  const slot = formData.get("slot");
  const clientName = formData.get("client_name");
  const clientPhone = formData.get("client_phone");

  if (
    typeof id !== "string" ||
    typeof serviceId !== "string" ||
    typeof date !== "string" ||
    typeof slot !== "string" ||
    typeof clientName !== "string" ||
    !clientName.trim() ||
    typeof clientPhone !== "string" ||
    !clientPhone.trim()
  ) {
    return {
      error: "Veuillez remplir tous les champs et choisir un créneau.",
    };
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
      service_id: serviceId,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
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
