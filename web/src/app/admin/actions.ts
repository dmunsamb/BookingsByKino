"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";

/**
 * Validation/refus d'une inscription par la plateforme. S'appuie sur la
 * policy RLS existante owner_update_business (is_owner_of, qui traite
 * déjà platform_admin comme propriétaire de tout établissement) — pas
 * besoin de policy dédiée.
 */
async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
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
