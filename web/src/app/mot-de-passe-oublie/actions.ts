"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getSiteOrigin } from "@/lib/site-url";

export type RequestResetState = { error?: string; success?: boolean };

const RESET_RATE_LIMIT_MAX = 5;
const RESET_RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Envoie un email de réinitialisation via Supabase Auth. Répond toujours
 * "succès" que l'email existe ou non — sinon ce formulaire deviendrait un
 * moyen de vérifier quels emails ont un compte KinoBooking.
 *
 * Nécessite un fournisseur d'envoi d'email correctement configuré côté
 * Supabase (Authentication → Emails) : le service intégré par défaut a des
 * limites très basses, à ne pas utiliser tel quel en production.
 */
export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `password-reset:${ip}`,
    RESET_RATE_LIMIT_MAX,
    RESET_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return { error: "Trop de tentatives. Merci de réessayer dans une minute." };
  }

  const email = formData.get("email");
  if (typeof email !== "string" || !email.trim()) {
    return { error: "Veuillez indiquer votre email." };
  }

  const origin = await getSiteOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/confirm?next=/reinitialiser-mot-de-passe`,
  });

  return { success: true };
}
