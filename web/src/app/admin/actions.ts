"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealProfile } from "@/lib/auth/dal";

/**
 * Validation/refus d'une inscription par la plateforme. S'appuie sur la
 * policy RLS existante owner_update_business (is_owner_of, qui traite
 * déjà platform_admin comme propriétaire de tout établissement) — pas
 * besoin de policy dédiée.
 *
 * getRealProfile() (jamais getCurrentProfile) : ces actions viennent
 * toutes de /admin, qui doit rester utilisable avec les vrais droits du
 * compte connecté même pendant une session "voir en tant que" ouverte
 * ailleurs.
 */
async function requirePlatformAdmin() {
  const profile = await getRealProfile();
  return profile?.role === "platform_admin" ? profile : null;
}

const ALLOWED_DURATION_MONTHS = [1, 3, 12] as const;

function parseDurationMonths(formData: FormData): number | null {
  const raw = formData.get("months");
  const months = Number(raw);
  if (
    !ALLOWED_DURATION_MONTHS.includes(
      months as (typeof ALLOWED_DURATION_MONTHS)[number]
    )
  ) {
    return null;
  }
  return months;
}

function parseAmountUsd(formData: FormData): number | null {
  const raw = formData.get("amount_usd");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Étape 1/2 : approuve l'inscription "sous conditions" — PAS d'accès au
 * tableau de bord à ce stade (dashboard/page.tsx bloque tout ce qui n'est
 * pas signup_status = 'approved'). Fait juste passer pending_approval ->
 * awaiting_payment ; le message WhatsApp envoyé au gérant (voir
 * ApproveSignupButton) porte les tarifs et les numéros mobile money DE
 * KINOBOOKING. L'accès réel n'est donné qu'à l'étape 2, une fois le
 * paiement confirmé (voir recordSubscriptionPayment).
 */
export async function conditionallyApproveBusiness(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({ signup_status: "awaiting_payment" })
    .eq("id", id);

  revalidatePath("/admin");
}

/**
 * Étape 2/2 (ou renouvellement) : enregistre un paiement d'abonnement.
 * Passe aussi signup_status à 'approved' — c'est ce qui donne réellement
 * accès au tableau de bord pour un établissement encore
 * "awaiting_payment" ; sans effet pour un renouvellement, déjà approuvé.
 * Prolonge depuis la date déjà payée si elle est encore dans le futur
 * (paiement anticipé), sinon depuis maintenant (première activation ou
 * renouvellement après coupure).
 */
export async function recordSubscriptionPayment(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) return;

  const id = formData.get("id");
  const months = parseDurationMonths(formData);
  const amountUsd = parseAmountUsd(formData);
  if (typeof id !== "string" || months === null || amountUsd === null) return;

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_paid_until")
    .eq("id", id)
    .maybeSingle();

  const currentPaidUntil = business?.subscription_paid_until
    ? new Date(business.subscription_paid_until)
    : null;
  const now = new Date();
  const base = currentPaidUntil && currentPaidUntil > now ? currentPaidUntil : now;

  await supabase
    .from("businesses")
    .update({
      signup_status: "approved",
      subscription_paid_until: addMonths(base, months).toISOString(),
    })
    .eq("id", id);

  await supabase.from("subscription_payments").insert({
    business_id: id,
    amount_usd: amountUsd,
    duration_months: months,
    recorded_by: admin.id,
  });

  revalidatePath("/admin");
}

export async function rejectBusiness(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({ signup_status: "rejected" })
    .eq("id", id);

  revalidatePath("/admin");
}

/**
 * Met à jour les tarifs d'abonnement (1/3/12 mois) affichés en
 * pré-sélection lors de l'enregistrement d'un paiement gérant.
 */
export async function updateSubscriptionPrices(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) throw new Error("Accès réservé à l'équipe KinoBooking.");

  const supabase = await createClient();
  for (const months of ALLOWED_DURATION_MONTHS) {
    const raw = formData.get(`price_${months}`);
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Montant invalide.");
    }
    const { error } = await supabase
      .from("subscription_prices")
      .update({ amount_usd: amount, updated_at: new Date().toISOString() })
      .eq("duration_months", months);
    if (error) throw new Error("Erreur lors de l'enregistrement des tarifs.");
  }

  revalidatePath("/admin");
}

/**
 * Numéros mobile money DE KINOBOOKING (pour recevoir l'abonnement des
 * gérants) + contact de secours (Dino) — à ne pas confondre avec
 * businesses.mpesa_number/orange_money_number, qui servent à un
 * établissement à recevoir SES propres clientes.
 */
export async function updatePlatformPaymentSettings(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) throw new Error("Accès réservé à l'équipe KinoBooking.");

  const field = (name: string) => {
    const raw = formData.get(name);
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_payment_settings")
    .update({
      mpesa_number: field("mpesa_number"),
      mpesa_holder_name: field("mpesa_holder_name"),
      orange_money_number: field("orange_money_number"),
      orange_money_holder_name: field("orange_money_holder_name"),
      contact_name: field("contact_name"),
      contact_whatsapp: field("contact_whatsapp"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    throw new Error("Erreur lors de l'enregistrement.");
  }

  revalidatePath("/admin");
}

/**
 * Assignation salon <-> commercial (décision produit : uniquement le super
 * admin, jamais à l'inscription ni par le commercial lui-même — un seul
 * commercial assigné par salon suffit pour l'instant). "" désassigne.
 */
export async function assignSalesRep(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) return;

  const businessId = formData.get("business_id");
  const salesProfileId = formData.get("sales_profile_id");
  if (typeof businessId !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("business_sales_reps")
    .delete()
    .eq("business_id", businessId);

  if (typeof salesProfileId === "string" && salesProfileId) {
    await supabase
      .from("business_sales_reps")
      .insert({ business_id: businessId, profile_id: salesProfileId });
  }

  revalidatePath("/admin");
}

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Mot de passe temporaire lisible (pas de 0/O/1/l/I ambigus) — le super admin le transmet lui-même par WhatsApp, voir createSalesRep. */
function generateTempPassword(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

export type SalesRepFormState = {
  error?: string;
  created?: { email: string; password: string };
};

/**
 * Création d'un compte commercial KINO CONGO — jamais d'auto-inscription
 * publique pour ce rôle (accès aux données clients de tous les salons
 * assignés, voir discussion produit) : uniquement le super admin, depuis
 * /admin. Même mécanisme que l'inscription d'un gérant
 * (inscription/actions.ts), sans création d'établissement. Le mot de
 * passe est généré ici puis affiché une seule fois : à transmettre par
 * WhatsApp (aucun envoi d'email configuré sur ce projet).
 */
export async function createSalesRep(
  _prevState: SalesRepFormState,
  formData: FormData
): Promise<SalesRepFormState> {
  const admin = await requirePlatformAdmin();
  if (!admin) return { error: "Accès réservé à l'équipe KinoBooking." };

  const fullName = formData.get("full_name");
  const emailRaw = formData.get("email");
  if (typeof fullName !== "string" || !fullName.trim()) {
    return { error: "Veuillez indiquer un nom." };
  }
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (!email) {
    return { error: "Veuillez indiquer un email." };
  }

  const adminClient = createAdminClient();
  const password = generateTempPassword();

  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
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

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: userData.user.id,
    business_id: null,
    full_name: fullName.trim(),
    role: "sales",
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userData.user.id);
    return { error: "Erreur lors de la création du profil." };
  }

  revalidatePath("/admin");
  return { created: { email, password } };
}

/**
 * Retire l'accès d'un commercial — supprime le compte Supabase Auth, ce
 * qui supprime en cascade son profil et ses assignations de salons (voir
 * migration 0035, on delete cascade). Jamais accessible à un sales pour
 * lui-même : uniquement le super admin.
 */
export async function deleteSalesRep(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const adminClient = createAdminClient();
  await adminClient.auth.admin.deleteUser(id);

  revalidatePath("/admin");
}

export type ResetPasswordState = {
  error?: string;
  newPassword?: string;
};

/**
 * Réinitialise le mot de passe d'un compte (gérant OU commercial) —
 * décision produit : seul le super admin peut le faire, jamais le
 * gérant/personnel/commercial lui-même en libre-service (pas de flux
 * "mot de passe oublié" par email sur ce projet, voir discussion). Le
 * nouveau mot de passe est affiché une seule fois : à transmettre par
 * WhatsApp, exactement comme pour la création d'un commercial.
 */
export async function resetUserPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const admin = await requirePlatformAdmin();
  if (!admin) return { error: "Accès réservé à l'équipe KinoBooking." };

  const id = formData.get("id");
  if (typeof id !== "string") return { error: "Compte introuvable." };

  const adminClient = createAdminClient();
  const password = generateTempPassword();

  const { error } = await adminClient.auth.admin.updateUserById(id, {
    password,
  });

  if (error) {
    return { error: "Une erreur est survenue. Merci de réessayer." };
  }

  return { newPassword: password };
}
