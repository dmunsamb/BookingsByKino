"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { localSlotToIso } from "@/lib/availability";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { parseBookingReference } from "@/lib/booking-reference";

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
  const acceptedTerms = formData.get("accepted_terms");

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

  // Défense en profondeur : la case à cocher est déjà obligatoire côté
  // interface (bouton désactivé tant qu'elle n'est pas cochée), mais un
  // envoi direct du formulaire (JS désactivé, requête forgée) ne doit pas
  // pouvoir la contourner.
  if (acceptedTerms !== "on") {
    return {
      error:
        "Merci d'accepter les conditions générales de vente avant d'envoyer votre demande.",
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

// Le ticket "sans rendez-vous" a son propre module dédié, avec scan QR
// obligatoire sur place : voir etablissements/[id]/file-attente/actions.ts.

export type ReviewFormState = { error?: string; success?: boolean };

const REVIEW_RATE_LIMIT_MAX = 5;
const REVIEW_RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Avis client (note + commentaire), vérifié via le numéro de suivi ET le
 * numéro de téléphone de la réservation (voir submit_business_review,
 * migration 0037) — sans compte client, c'est la seule preuve qu'on a
 * affaire à quelqu'un réellement servi. Rate-limité comme les autres
 * formulaires publics : un numéro de suivi seul étant court et
 * séquentiel, il ne faut pas laisser deviner des combinaisons en boucle.
 */
export async function submitReview(
  _prevState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `review:${ip}`,
    REVIEW_RATE_LIMIT_MAX,
    REVIEW_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return {
      error: "Trop de tentatives. Merci de réessayer dans une minute.",
    };
  }

  const referenceRaw = formData.get("reference_number");
  const clientPhone = formData.get("client_phone");
  const ratingRaw = formData.get("rating");
  const commentRaw = formData.get("comment");

  const referenceNumber =
    typeof referenceRaw === "string" ? parseBookingReference(referenceRaw) : null;
  const rating = Number(ratingRaw);

  if (
    referenceNumber == null ||
    typeof clientPhone !== "string" ||
    !clientPhone.trim() ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return {
      error:
        "Veuillez indiquer un numéro de suivi valide, le numéro utilisé pour la réservation, et une note.",
    };
  }

  const comment = typeof commentRaw === "string" ? commentRaw.trim() : "";
  if (comment.length > 500) {
    return { error: "Le commentaire ne peut pas dépasser 500 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("submit_business_review", {
      p_reference_number: referenceNumber,
      p_client_phone: clientPhone.trim(),
      p_rating: rating,
      p_comment: comment || null,
    })
    .single();

  if (error || !data) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  const result = data as { ok: boolean; message: string };
  if (!result.ok) {
    return { error: result.message };
  }

  return { success: true };
}
