"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { localSlotToIso } from "@/lib/availability";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Soumission d'une demande de réservation "avec RDV" par le client
 * (FR-2.8, US-C3). Insertion via le client Supabase "anon" — la policy
 * public_insert_klant_bookings n'autorise que source=klant_app avec
 * status=pending_approval (BR-2 : gratuit et non engageant tant que la
 * établissement n'a pas validé). La capacité réelle est vérifiée côté base par le
 * trigger enforce_agenda_capacity (0004_enforce_agenda_capacity.sql).
 */

export type BookingFormState = { error?: string };

const BOOKING_RATE_LIMIT_MAX = 5;
const BOOKING_RATE_LIMIT_WINDOW_SECONDS = 60;

export async function createBookingRequest(
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `booking:${ip}`,
    BOOKING_RATE_LIMIT_MAX,
    BOOKING_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return {
      error: "Trop de demandes envoyées. Merci de réessayer dans une minute.",
    };
  }

  const businessId = formData.get("business_id");
  const serviceId = formData.get("service_id");
  const date = formData.get("date");
  const slot = formData.get("slot");
  const clientName = formData.get("client_name");
  const clientPhone = formData.get("client_phone");

  if (
    typeof businessId !== "string" ||
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

  // Réservé via une fonction dédiée (pas un INSERT ... RETURNING) : le
  // client anonyme n'a aucune policy SELECT sur agenda_entries (vie
  // privée, voir 0002), donc RETURNING échouerait. On récupère le
  // numéro avant l'insertion pour pouvoir l'afficher tout de suite sur
  // la page de remerciement (US demandée : suivi sans compte client).
  const { data: referenceNumber, error: refError } = await supabase.rpc(
    "next_booking_reference"
  );

  if (refError || referenceNumber == null) {
    return {
      error: "Une erreur est survenue. Merci de réessayer.",
    };
  }

  const { error } = await supabase.from("agenda_entries").insert({
    business_id: businessId,
    service_id: serviceId,
    source: "klant_app",
    status: "pending_approval",
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

  redirect(`/etablissements/${businessId}?confirmed=1&ref=${referenceNumber}`);
}
