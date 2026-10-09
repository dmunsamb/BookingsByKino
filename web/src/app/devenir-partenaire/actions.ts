"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export type ContactFormState = { error?: string; success?: boolean };

const CONTACT_RATE_LIMIT_MAX = 5;
const CONTACT_RATE_LIMIT_WINDOW_SECONDS = 300;
const MESSAGE_MAX_LENGTH = 1000;

/**
 * Formulaire de contact de la sales page (/devenir-partenaire) — même
 * schéma d'écriture publique que le reste du projet (inscription,
 * réservation) : client admin côté serveur, aucune policy INSERT
 * ouverte sur contact_messages (voir migration 0044).
 */
export async function submitContactMessage(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `contact:${ip}`,
    CONTACT_RATE_LIMIT_MAX,
    CONTACT_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return { error: "Trop de tentatives. Merci de réessayer plus tard." };
  }

  const nameRaw = formData.get("name");
  const contactRaw = formData.get("contact");
  const messageRaw = formData.get("message");

  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  const contact = typeof contactRaw === "string" ? contactRaw.trim() : "";
  const message = typeof messageRaw === "string" ? messageRaw.trim() : "";

  if (!name || !contact || !message) {
    return { error: "Veuillez remplir tous les champs." };
  }

  if (message.length > MESSAGE_MAX_LENGTH) {
    return {
      error: `Le message ne peut pas dépasser ${MESSAGE_MAX_LENGTH} caractères.`,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("contact_messages")
    .insert({ name, contact, message });

  if (error) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  return { success: true };
}
