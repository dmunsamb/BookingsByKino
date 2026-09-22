"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { toE164CongoPhone } from "@/lib/phone";

export type LoginState = {
  error?: string;
};

const LOGIN_RATE_LIMIT_MAX = 10;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Connexion gérant/personnel (US-O1, US-S1). Pas d'inscription libre : les
 * comptes sont créés lors de l'onboarding par le platformbeheerder
 * (US-A1), voir supabase/migrations/0002_rls_policies.sql.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `login:${ip}`,
    LOGIN_RATE_LIMIT_MAX,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return { error: "Trop de tentatives. Merci de réessayer dans une minute." };
  }

  const identifier = formData.get("identifier");
  const password = formData.get("password");

  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    !identifier.trim() ||
    !password
  ) {
    return { error: "Identifiant et mot de passe requis." };
  }

  // Un gérant se connecte par email, un membre de l'équipe par téléphone
  // (voir dashboard/equipe : octroi d'accès sans email) — un seul champ
  // "Email ou téléphone" détecte le format plutôt que deux formulaires.
  const trimmed = identifier.trim();
  const supabase = await createClient();

  let signInError: { message: string } | null;
  if (trimmed.includes("@")) {
    ({ error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    }));
  } else {
    const phone = toE164CongoPhone(trimmed);
    if (!phone) {
      return { error: "Identifiant ou mot de passe incorrect." };
    }
    ({ error: signInError } = await supabase.auth.signInWithPassword({
      phone,
      password,
    }));
  }

  if (signInError) {
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  redirect("/dashboard");
}
