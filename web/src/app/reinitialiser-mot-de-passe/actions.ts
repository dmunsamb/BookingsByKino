"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SetPasswordState = { error?: string };

const MIN_PASSWORD_LENGTH = 8;

/**
 * Choix d'un nouveau mot de passe après un lien de réinitialisation —
 * repose sur la session "recovery" déjà établie par /auth/confirm (jamais
 * appelée sans cette session, voir page.tsx qui vérifie sa présence avant
 * d'afficher le formulaire).
 */
export async function setNewPassword(
  _prevState: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirm_password");

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }
  if (password !== confirmPassword) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Lien expiré. Merci de refaire une demande." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  redirect("/dashboard");
}
