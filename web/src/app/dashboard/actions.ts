"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const ALLOWED_BOOKING_STATUSES = [
  "pending_approval",
  "approved_waiting_payment",
  "confirmed",
  "geannuleerd",
  "termine",
  "no_show",
] as const;

/**
 * Fait passer une réservation à un nouveau statut (validation d'une demande,
 * confirmation de paiement, annulation...). L'écriture est de toute façon
 * restreinte au personnel/gérant de l'établissement côté base (policy
 * staff_update_own_agenda) ; on revérifie ici par prudence.
 */
export async function updateBookingStatus(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return;
  if (profile.role !== "owner" && profile.role !== "staff") return;

  const id = formData.get("id");
  const status = formData.get("status");
  if (
    typeof id !== "string" ||
    typeof status !== "string" ||
    !ALLOWED_BOOKING_STATUSES.includes(
      status as (typeof ALLOWED_BOOKING_STATUSES)[number]
    )
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("agenda_entries")
    .update({ status })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard");
}

const ALLOWED_MOBILE_MONEY_PROVIDERS = [
  "mpesa",
  "orange_money",
  "airtel_money",
] as const;

/**
 * Numéro mobile money de l'établissement (M-Pesa, Orange Money ou Airtel
 * Money — un seul actif à la fois), communiqué manuellement par le gérant
 * au client une fois la demande validée (BR-3 : l'acompte est payé
 * directement au gérant, hors plateforme — phase 1, pas d'intégration
 * de paiement réelle, voir section 12.2 du cahier de charge).
 */
export async function updateMobileMoneyInfo(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return;
  if (profile.role !== "owner") return;

  const momoNumber = formData.get("mobile_money_number");
  const provider = formData.get("mobile_money_provider");
  if (typeof momoNumber !== "string" || typeof provider !== "string") return;
  if (
    !ALLOWED_MOBILE_MONEY_PROVIDERS.includes(
      provider as (typeof ALLOWED_MOBILE_MONEY_PROVIDERS)[number]
    )
  ) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({
      mobile_money_number: momoNumber.trim() || null,
      mobile_money_provider: provider,
    })
    .eq("id", profile.business_id);

  revalidatePath("/dashboard");
}
