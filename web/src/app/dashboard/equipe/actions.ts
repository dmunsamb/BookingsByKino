"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentProfile,
  canManageBusiness,
  canManageTeam,
  isImpersonationRestricted,
} from "@/lib/auth/dal";
import { uploadPhoto } from "@/lib/supabase/media-admin";
import { toE164CongoPhone } from "@/lib/phone";

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
  if (!canManageTeam(profile)) {
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
  if (!profile || !canManageTeam(profile)) return;

  // Suppression irréversible d'un membre du personnel — bloquée en mode
  // "voir en tant que" pour un commercial (décision produit).
  if (await isImpersonationRestricted()) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();

  // Un compte de connexion éventuellement lié (voir grantStaffAccess) doit
  // être supprimé en même temps, sinon l'ex-employé garde un accès
  // fonctionnel bien que retiré de l'équipe.
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("profile_id")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("staff_members").delete().eq("id", id);

  if (staffMember?.profile_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(staffMember.profile_id);
  }

  revalidatePath("/dashboard/equipe");
}

const MIN_STAFF_PASSWORD_LENGTH = 6;

export type StaffAccessFormState = { error?: string };

/**
 * Octroi d'un accès dashboard à un membre de l'équipe : téléphone + mot de
 * passe (pas d'email — un employé n'en a pas forcément), avec un rôle au
 * choix — "coiffeur/coiffeuse" (accès agenda/file d'attente uniquement) ou
 * "gérant" (mêmes droits que le propriétaire, sauf gérer l'équipe, voir
 * canManageTeam). Toujours via le client admin (service-role) : c'est la
 * seule façon de créer un compte Supabase Auth par téléphone sans passer
 * par un flux d'inscription publique (voir login/actions.ts).
 */
export async function grantStaffAccess(
  _prevState: StaffAccessFormState,
  formData: FormData
): Promise<StaffAccessFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageTeam(profile)) {
    return { error: "Seul le gérant peut donner un accès." };
  }
  if (await isImpersonationRestricted()) {
    return { error: "Action indisponible en mode \"voir en tant que\"." };
  }

  const staffId = formData.get("staff_id");
  const phoneRaw = formData.get("phone");
  const password = formData.get("password");
  const isManager = formData.get("is_manager") === "on";

  if (typeof staffId !== "string" || typeof phoneRaw !== "string") {
    return { error: "Formulaire invalide." };
  }

  const phone = toE164CongoPhone(phoneRaw);
  if (!phone) {
    return {
      error:
        "Numéro invalide. Utilisez un numéro congolais (ex : 081 234 5678 ou +243 81 234 5678).",
    };
  }

  if (typeof password !== "string" || password.length < MIN_STAFF_PASSWORD_LENGTH) {
    return {
      error: `Le mot de passe doit contenir au moins ${MIN_STAFF_PASSWORD_LENGTH} caractères.`,
    };
  }

  const supabase = await createClient();
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("id, name, profile_id")
    .eq("id", staffId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (!staffMember) {
    return { error: "Membre introuvable." };
  }
  if (staffMember.profile_id) {
    return { error: "Ce membre a déjà un accès." };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
  });

  if (createError || !created.user) {
    return {
      error: createError?.message.toLowerCase().includes("already")
        ? "Ce numéro est déjà utilisé par un autre compte."
        : "Une erreur est survenue. Merci de réessayer.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    business_id: profile.business_id,
    full_name: staffMember.name,
    role: "staff",
    is_manager: isManager,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  await admin
    .from("staff_members")
    .update({ profile_id: created.user.id })
    .eq("id", staffId);

  revalidatePath("/dashboard/equipe");
  return {};
}

/** Retire l'accès dashboard d'un membre — supprime son compte, jamais sa fiche staff_members. */
export async function revokeStaffAccess(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageTeam(profile)) return;
  if (await isImpersonationRestricted()) return;

  const staffId = formData.get("staff_id");
  if (typeof staffId !== "string") return;

  const supabase = await createClient();
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("profile_id")
    .eq("id", staffId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (!staffMember?.profile_id) return;

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(staffMember.profile_id);
  // La suppression de l'utilisateur Auth cascade déjà vers profiles ; le
  // FK staff_members.profile_id (on delete set null) nettoie cette ligne
  // automatiquement, pas besoin d'un update explicite ici.

  revalidatePath("/dashboard/equipe");
}

/** Bascule coiffeur/coiffeuse <-> gérant pour un accès déjà octroyé. */
export async function updateStaffAccessRole(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageTeam(profile)) return;
  if (await isImpersonationRestricted()) return;

  const staffId = formData.get("staff_id");
  const isManager = formData.get("is_manager") === "true";
  if (typeof staffId !== "string") return;

  const supabase = await createClient();
  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("profile_id")
    .eq("id", staffId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (!staffMember?.profile_id) return;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ is_manager: isManager })
    .eq("id", staffMember.profile_id);

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
