"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { uploadPhoto } from "@/lib/supabase/media-admin";

/**
 * Liste nommée des membres du personnel (US demandée : "Équipe").
 * Assignable à une réservation pour affichage/organisation, et depuis la
 * migration 0026, préalable obligatoire pour définir un horaire (chaque
 * ligne d'availability_rules doit être rattachée à un membre actif).
 */

export type StaffFormState = { error?: string; success?: boolean };

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

  const photoUrl = await uploadPhoto(
    formData.get("photo"),
    `staff/${profile.business_id}`
  );

  const supabase = await createClient();
  const { error } = await supabase.from("staff_members").insert({
    business_id: profile.business_id,
    name: name.trim(),
    photo_url: photoUrl,
  });

  if (error) {
    return { error: `Erreur lors de l'enregistrement : ${error.message}` };
  }

  revalidatePath("/dashboard/equipe");
  return { success: true };
}

export async function updateStaffPhoto(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const photoUrl = await uploadPhoto(
    formData.get("photo"),
    `staff/${profile.business_id}`
  );
  if (!photoUrl) return;

  const supabase = await createClient();
  await supabase
    .from("staff_members")
    .update({ photo_url: photoUrl })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard/equipe");
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
