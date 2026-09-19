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
 * Approuve l'inscription : accès immédiat au tableau de bord, mais "sous
 * réserve" du paiement de l'abonnement — subscription_paid_until reste
 * null (déjà traité comme "actif" par lib/subscription.ts, voir 0029).
 * Le message WhatsApp envoyé au gérant (voir SubscriptionPaymentDialog/
 * ApproveSignupButton) porte les tarifs et les numéros mobile money de
 * KinoBooking ; le paiement lui-même s'enregistre séparément, une fois
 * reçu, via recordSubscriptionPayment (même mécanisme qu'un renouvellement).
 */
export async function approveBusiness(formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (!admin) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({ signup_status: "approved" })
    .eq("id", id);

  revalidatePath("/admin");
}

/**
 * Enregistre un paiement d'abonnement pour un établissement déjà
 * approuvé (renouvellement). Prolonge depuis la date déjà payée si elle
 * est encore dans le futur (paiement anticipé), sinon depuis maintenant
 * (renouvellement après coupure).
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
    .update({ subscription_paid_until: addMonths(base, months).toISOString() })
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
