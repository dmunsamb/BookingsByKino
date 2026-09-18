"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";

/**
 * Liste nommée des membres du personnel (US demandée : "Équipe"). Voir
 * la note en tête de la migration 0021_multi_business_and_staff.sql :
 * purement organisationnel/affichage, sans effet sur la capacité de
 * réservation.
 */

export type StaffFormState = { error?: string };

export async function createStaffMember(
  _prevState: StaffFormState,
  formData: FormData
): Promise<StaffFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (!canManageBusiness(profile)) {
    return { error: "Seul le gérant peut modifier l'équipe." };
  }

  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Veuillez indiquer un nom." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("staff_members").insert({
    business_id: profile.business_id,
    name: name.trim(),
  });

  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/equipe");
  return {};
}

export async function toggleStaffActive(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  const active = formData.get("active");
  if (typeof id !== "string" || typeof active !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("staff_members")
    .update({ active: active === "true" })
    .eq("id", id);

  revalidatePath("/dashboard/equipe");
}

export async function deleteStaffMember(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("staff_members").delete().eq("id", id);

  revalidatePath("/dashboard/equipe");
}
