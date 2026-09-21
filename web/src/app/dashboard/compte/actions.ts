"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";

export type ChangePasswordState = {
  error?: string;
  success?: boolean;
};

/**
 * Changement de mot de passe en libre-service, pour n'importe quel
 * compte connecté (gérant, personnel, commercial, platform_admin) —
 * indispensable pour transformer un mot de passe temporaire (généré
 * depuis /admin, voir admin/actions.ts) en mot de passe définitif.
 * Différent du changement d'EMAIL, resté réservé à platform_admin (voir
 * discussion produit : Supabase enverrait un email de confirmation
 * avant que le changement prenne effet, et aucun envoi d'email fiable
 * n'est configuré sur ce projet).
 *
 * Ne dépend jamais d'une session "voir en tant que" : agit toujours sur
 * le VRAI compte connecté (auth.uid()), jamais sur le salon impersonné —
 * pas besoin d'appeler isImpersonationRestricted() ici.
 */
export async function changeOwnPassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireUser();

  const currentPassword = formData.get("current_password");
  const newPassword = formData.get("new_password");
  const confirmPassword = formData.get("confirm_password");

  if (typeof currentPassword !== "string" || !currentPassword) {
    return { error: "Veuillez indiquer votre mot de passe actuel." };
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return {
      error: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }
  if (!user.email) {
    return { error: "Compte sans email associé — impossible de vérifier." };
  }

  const supabase = await createClient();

  // Revérifie le mot de passe actuel avant de le changer — évite qu'une
  // session laissée ouverte (téléphone partagé, tablette du salon)
  // suffise à elle seule pour changer le mot de passe.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  return { success: true };
}
