"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

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

  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  redirect("/dashboard");
}
