"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isStaffMember } from "@/lib/auth/dal";
import { localSlotToIso } from "@/lib/availability";

/**
 * Création manuelle d'une réservation par le personnel/gérant (US-O14,
 * US-S4) — un rendez-vous pris par téléphone ou en personne. Confirmée
 * immédiatement (pas d'étape de validation : c'est déjà le personnel qui
 * l'a arrangée directement avec le client), mais passe par le même
 * contrôle de capacité que les autres sources (enforce_agenda_capacity),
 * pour ne jamais créer de double réservation avec l'agenda en ligne.
 */

export type NewBookingFormState = { error?: string };

export async function createManualBooking(
  _prevState: NewBookingFormState,
  formData: FormData
): Promise<NewBookingFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !isStaffMember(profile)) {
    return { error: "Action non autorisée." };
  }

  const serviceId = formData.get("service_id");
  const date = formData.get("date");
  const slot = formData.get("slot");
  const clientName = formData.get("client_name");
  const clientPhone = formData.get("client_phone");

  if (
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

  const { data: referenceNumber, error: refError } = await supabase.rpc(
    "next_booking_reference"
  );

  if (refError || referenceNumber == null) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  const { error } = await supabase.from("agenda_entries").insert({
    business_id: profile.business_id,
    service_id: serviceId,
    source: "manueel",
    status: "confirmed",
    client_name: clientName.trim(),
    client_phone: clientPhone.trim(),
    start_time: startIso,
    end_time: endDate.toISOString(),
    reference_number: referenceNumber,
  });

  if (error) {
    return {
      error:
        "Ce créneau n'est plus disponible ou une erreur est survenue. Merci de réessayer.",
    };
  }

  redirect("/dashboard");
}
