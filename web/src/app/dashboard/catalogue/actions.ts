"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";

/**
 * Gestion du catalogue de services (FR-5.1/5.2/5.3, US-O6). L'écriture est
 * de toute façon restreinte au gérant côté base de données (policies
 * owner_write_services / owner_update_services / owner_delete_services) ;
 * on revérifie ici pour renvoyer un message clair plutôt qu'une erreur
 * RLS brute.
 */

export type ServiceFormState = { error?: string };

export async function createService(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (profile.role !== "owner") {
    return { error: "Seul le gérant peut modifier le catalogue." };
  }

  const name = formData.get("name");
  const category = formData.get("category");
  const description = formData.get("description");
  const durationMinutes = Number(formData.get("duration_minutes"));
  const priceUsd = Number(formData.get("price_usd"));
  const depositUsd = Number(formData.get("deposit_usd"));

  if (
    typeof name !== "string" ||
    !name.trim() ||
    Number.isNaN(durationMinutes) ||
    durationMinutes <= 0 ||
    Number.isNaN(priceUsd) ||
    priceUsd < 0 ||
    Number.isNaN(depositUsd) ||
    depositUsd < 0
  ) {
    return { error: "Veuillez remplir tous les champs correctement." };
  }

  if (depositUsd > priceUsd) {
    return {
      error: "L'acompte ne peut pas être supérieur au prix total.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    business_id: profile.business_id,
    name: name.trim(),
    category: typeof category === "string" && category.trim() ? category.trim() : null,
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : null,
    duration_minutes: durationMinutes,
    price_usd: priceUsd,
    deposit_usd: depositUsd,
  });

  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/catalogue");
  return {};
}

export async function deleteService(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id);

  revalidatePath("/dashboard/catalogue");
}
