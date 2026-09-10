"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Auto-inscription d'un nouveau gérant. Toutes les écritures passent par
 * le client admin (service-role) plutôt que par des policies RLS
 * publiques : on ne veut pas ouvrir de policy INSERT sur businesses/
 * profiles accessible à n'importe quel visiteur non authentifié — ce
 * flux reste le seul chemin d'écriture, entièrement côté serveur et
 * validé ici.
 *
 * L'établissement créé reste en statut "pending_approval" (voir
 * migration 0014) : invisible du catalogue public tant que KinoBooking
 * ne l'a pas validé manuellement.
 *
 * L'email est obligatoire (c'est l'identifiant de connexion Supabase
 * Auth — pas d'authentification par téléphone sur ce projet). Le numéro
 * WhatsApp reste optionnel : c'est une simple coordonnée de contact,
 * utilisée notamment pour les rappels de paiement d'abonnement envoyés
 * par KinoBooking (voir /admin).
 */

export type SignupState = { error?: string };

const BUSINESS_TYPES = ["Salon de coiffure", "Salon de beauté"] as const;
const SIGNUP_RATE_LIMIT_MAX = 5;
const SIGNUP_RATE_LIMIT_WINDOW_SECONDS = 300;

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const ip = getClientIp(await headers());
  const allowed = await checkRateLimit(
    `signup:${ip}`,
    SIGNUP_RATE_LIMIT_MAX,
    SIGNUP_RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return {
      error: "Trop de tentatives. Merci de réessayer dans quelques minutes.",
    };
  }

  const ownerName = formData.get("owner_name");
  const emailRaw = formData.get("email");
  const whatsappRaw = formData.get("whatsapp");
  const password = formData.get("password");
  const businessName = formData.get("business_name");
  const type = formData.get("type");
  const address = formData.get("address");
  const city = formData.get("city");
  const logo = formData.get("logo");

  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  const whatsapp = typeof whatsappRaw === "string" ? whatsappRaw.trim() : "";

  if (
    typeof ownerName !== "string" ||
    !ownerName.trim() ||
    !email ||
    typeof password !== "string" ||
    typeof businessName !== "string" ||
    !businessName.trim() ||
    typeof type !== "string" ||
    !BUSINESS_TYPES.includes(type as (typeof BUSINESS_TYPES)[number])
  ) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  if (password.length < 8) {
    return {
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    const alreadyExists =
      userError?.code === "email_exists" ||
      /already.*registered|already.*exists/i.test(userError?.message ?? "");
    return {
      error: alreadyExists
        ? "Un compte existe déjà avec cet email."
        : "Une erreur est survenue. Merci de réessayer.",
    };
  }

  let logoUrl: string | null = null;
  if (logo instanceof File && logo.size > 0) {
    const ext = logo.name.split(".").pop() || "jpg";
    const path = `${userData.user.id}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("business-logos")
      .upload(path, logo, { upsert: true, contentType: logo.type });

    if (!uploadError) {
      const { data: publicUrlData } = admin.storage
        .from("business-logos")
        .getPublicUrl(path);
      logoUrl = publicUrlData.publicUrl;
    }
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: businessName.trim(),
      main_category: "beauty",
      sub_category: type,
      address: typeof address === "string" ? address.trim() || null : null,
      city: typeof city === "string" ? city.trim() || null : null,
      image_url: logoUrl,
      signup_status: "pending_approval",
      owner_email: email,
      owner_whatsapp: whatsapp || null,
    })
    .select("id")
    .single();

  if (businessError || !business) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return {
      error: "Une erreur est survenue lors de la création de l'établissement.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userData.user.id,
    business_id: business.id,
    full_name: ownerName.trim(),
    role: "owner",
  });

  if (profileError) {
    await admin.from("businesses").delete().eq("id", business.id);
    await admin.auth.admin.deleteUser(userData.user.id);
    return {
      error: "Une erreur est survenue lors de la création du profil.",
    };
  }

  // Connecte immédiatement le gérant (cookies de session) pour qu'il
  // arrive sur son dashboard, même en attente de validation — plus
  // transparent que de le renvoyer se reconnecter manuellement.
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect("/dashboard");
}
