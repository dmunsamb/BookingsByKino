"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  canManageBusiness,
  isImpersonationRestricted,
} from "@/lib/auth/dal";
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

  // Suppression irréversible d'un membre du personnel — bloquée en mode
  // "voir en tant que" pour un commercial (décision produit).
  if (await isImpersonationRestricted()) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("staff_members").delete().eq("id", id);

  revalidatePath("/dashboard/equipe");
}

/**
 * Compétences par membre d'équipe (migration 0034) : quels services ce
 * membre peut rendre — utilisé pour filtrer la liste proposée à la
 * "prise en charge" dans la file d'attente sans rendez-vous. Aucune case
 * cochée = qualifié pour TOUT (comportement par défaut, compatible avec
 * les membres déjà créés) ; remplace toujours l'ensemble des lignes
 * plutôt que de les fusionner, pour rester fidèle à ce que le formulaire
 * envoie (des cases cochées, pas un diff).
 */
export async function updateStaffServices(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) return;

  const staffId = formData.get("staff_id");
  if (typeof staffId !== "string") return;

  const supabase = await createClient();

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("id")
    .eq("id", staffId)
    .eq("business_id", profile.business_id)
    .maybeSingle();
  if (!staffMember) return;

  const serviceIds = formData.getAll("service_ids").filter(
    (v): v is string => typeof v === "string"
  );

  await supabase
    .from("staff_member_services")
    .delete()
    .eq("staff_member_id", staffId);

  if (serviceIds.length > 0) {
    await supabase.from("staff_member_services").insert(
      serviceIds.map((serviceId) => ({
        staff_member_id: staffId,
        service_id: serviceId,
      }))
    );
  }

  revalidatePath("/dashboard/equipe");
}
