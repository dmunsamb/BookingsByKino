"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

/**
 * Connexion gérant/personnel (US-O1, US-S1). Pas d'inscription libre : les
 * comptes sont créés lors de l'onboarding par le platformbeheerder
 * (US-A1), voir supabase/migrations/0002_rls_policies.sql.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
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
