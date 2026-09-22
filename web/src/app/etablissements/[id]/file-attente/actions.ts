"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isBusinessOpenNow } from "@/lib/availability";

/**
 * Rejoindre la file d'attente sans rendez-vous (US-C4 étendu). Le geste
 * "scanner le QR" lui-même n'est vérifié que côté client (qr-scanner.tsx) —
 * ce n'est qu'un garde-fou d'usage, pas une preuve cryptographique de
 * présence sur place (voir lib/qr.ts). L'ouverture et la capacité de la
 * file sont revérifiées ici pour un message clair, et de toute façon
 * appliquées par le trigger enforce_agenda_capacity (0033) en dernier
 * recours.
 */
export type JoinQueueFormState = {
  error?: string;
  success?: boolean;
  referenceNumber?: number;
  position?: number;
};

const QUEUE_RATE_LIMIT_MAX = 5;
const QUEUE_RATE_LIMIT_WINDOW_SECONDS = 60;

export async function joinWalkinQueue(
  _prevState: JoinQueueFormState,
  formData: FormData
): Promise<JoinQueueFormState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `walkin_queue:${ip}`,
    QUEUE_RATE_LIMIT_MAX,
    QUEUE_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return {
      error: "Trop de demandes envoyées. Merci de réessayer dans une minute.",
    };
  }

  const businessId = formData.get("business_id");
  const serviceId = formData.get("service_id");
  const clientName = formData.get("client_name");
  const clientPhone = formData.get("client_phone");
  const noteRaw = formData.get("client_note");

  if (
    typeof businessId !== "string" ||
    typeof serviceId !== "string" ||
    typeof clientName !== "string" ||
    !clientName.trim() ||
    typeof clientPhone !== "string" ||
    !clientPhone.trim()
  ) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  const supabase = await createClient();

  const [{ data: business }, { data: service }] = await Promise.all([
    supabase
      .from("businesses")
      .select("walkin_queue_open, walkin_queue_capacity")
      .eq("id", businessId)
      .maybeSingle(),
    supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", serviceId)
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  if (!business) {
    return { error: "Établissement introuvable." };
  }
  if (!service) {
    return { error: "Service introuvable." };
  }
  if (!business.walkin_queue_open) {
    return {
      error: "La file d'attente sans rendez-vous est fermée pour le moment.",
    };
  }

  // Défense en profondeur : la page ne propose déjà le formulaire que
  // pendant les heures d'ouverture déclarées (voir page.tsx), mais un
  // envoi direct de la requête ne doit pas pouvoir contourner cette règle.
  const { data: businessHours } = await supabase
    .from("business_hours")
    .select("weekday, start_time, end_time")
    .eq("business_id", businessId);
  if (!isBusinessOpenNow(businessHours ?? [])) {
    return {
      error:
        "La file d'attente sans rendez-vous n'est accessible que pendant les heures d'ouverture du salon.",
    };
  }

  if (business.walkin_queue_capacity != null) {
    const { count } = await supabase
      .from("walkin_queue_public")
      .select("first_name", { count: "exact", head: true })
      .eq("business_id", businessId);
    if ((count ?? 0) >= business.walkin_queue_capacity) {
      return { error: "La file d'attente est complète pour le moment." };
    }
  }

  const startIso = new Date().toISOString();
  const endDate = new Date(startIso);
  endDate.setUTCMinutes(endDate.getUTCMinutes() + service.duration_minutes);

  const { data: referenceNumber, error: refError } = await supabase.rpc(
    "next_booking_reference"
  );
  if (refError || referenceNumber == null) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  const { error } = await supabase.from("agenda_entries").insert({
    business_id: businessId,
    service_id: serviceId,
    source: "walk_in",
    status: "confirmed",
    client_name: clientName.trim(),
    client_phone: clientPhone.trim(),
    client_note: note,
    start_time: startIso,
    end_time: endDate.toISOString(),
    reference_number: referenceNumber,
  });

  if (error) {
    return {
      error:
        "La file d'attente n'est plus disponible ou une erreur est survenue. Merci de réessayer.",
    };
  }

  // Position actuelle via la vue publique (anon n'a aucun accès direct à
  // agenda_entries) — approximative en cas de "décalage" concurrent
  // pile au même instant, acceptable à l'échelle d'un pilote.
  const { count: position } = await supabase
    .from("walkin_queue_public")
    .select("first_name", { count: "exact", head: true })
    .eq("business_id", businessId);

  return {
    success: true,
    referenceNumber,
    position: position ?? undefined,
  };
}
