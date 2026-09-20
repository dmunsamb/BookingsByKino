"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";

export type WalkinQueueCapacityFormState = {
  success?: boolean;
  error?: string;
};

/**
 * Capacité optionnelle de la file d'attente sans rendez-vous (migration
 * 0033) — vide/null signifie illimitée, comme demandé : ce n'est pas un
 * champ obligatoire pour que la file fonctionne, l'ouverture/fermeture se
 * gère séparément via WalkinQueueToggle.
 */
export async function updateWalkinQueueCapacity(
  _prevState: WalkinQueueCapacityFormState,
  formData: FormData
): Promise<WalkinQueueCapacityFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!canManageBusiness(profile)) {
    return { error: "Seul le gérant peut modifier ce réglage." };
  }

  const raw = formData.get("walkin_queue_capacity");
  let capacity: number | null = null;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return {
        error:
          "La capacité doit être un nombre entier positif, ou laissée vide pour une capacité illimitée.",
      };
    }
    capacity = parsed;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ walkin_queue_capacity: capacity })
    .eq("id", profile.business_id);

  if (error) {
    return { error: "Erreur lors de l'enregistrement. Merci de réessayer." };
  }

  revalidatePath("/dashboard/configuration/file-attente");
  return { success: true };
}
