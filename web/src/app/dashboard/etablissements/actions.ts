"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, requireUser } from "@/lib/auth/dal";

/**
 * Plusieurs salons par gérant. `profiles.business_id` reste
 * "l'établissement actif" (tout le reste du code applicatif le lit tel
 * quel) — ces deux actions ne font que : (1) créer un nouvel
 * établissement rattaché au compte déjà connecté, sans créer de
 * deuxième compte de connexion ; (2) basculer quel établissement est
 * actif parmi ceux que ce compte possède (business_owners).
 */

const BUSINESS_TYPES = ["Salon de coiffure", "Salon de beauté"] as const;

export type NewBusinessFormState = { error?: string };

export async function createAdditionalBusiness(
  _prevState: NewBusinessFormState,
  formData: FormData
): Promise<NewBusinessFormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") {
    return { error: "Action réservée aux gérants." };
  }

  const businessName = formData.get("business_name");
  const type = formData.get("type");
  const address = formData.get("address");
  const city = formData.get("city");
  const whatsappRaw = formData.get("whatsapp");
  const whatsapp = typeof whatsappRaw === "string" ? whatsappRaw.trim() : "";

  if (
    typeof businessName !== "string" ||
    !businessName.trim() ||
    typeof type !== "string" ||
    !BUSINESS_TYPES.includes(type as (typeof BUSINESS_TYPES)[number])
  ) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  const user = await requireUser();
  const admin = createAdminClient();

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: businessName.trim(),
      main_category: "beauty",
      sub_category: type,
      address: typeof address === "string" ? address.trim() || null : null,
      city: typeof city === "string" ? city.trim() || null : null,
      signup_status: "pending_approval",
      owner_email: user.email ?? null,
      owner_whatsapp: whatsapp || null,
    })
    .select("id")
    .single();

  if (businessError || !business) {
    return {
      error: "Une erreur est survenue lors de la création de l'établissement.",
    };
  }

  const { error: linkError } = await admin.from("business_owners").insert({
    business_id: business.id,
    profile_id: profile.id,
  });

  if (linkError) {
    await admin.from("businesses").delete().eq("id", business.id);
    return {
      error: "Une erreur est survenue lors de la création de l'établissement.",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/**
 * Bascule l'établissement actif du compte connecté. `profiles` n'a
 * aucune policy d'update pour les utilisateurs (voir migration 0002) —
 * cette écriture passe donc par le client admin, après avoir vérifié
 * nous-mêmes (avec le client normal, RLS) que ce profil possède bien
 * l'établissement demandé.
 */
export async function switchActiveBusiness(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") return;

  const businessId = formData.get("business_id");
  if (typeof businessId !== "string") return;

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("business_owners")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!membership) return;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ business_id: businessId })
    .eq("id", profile.id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
