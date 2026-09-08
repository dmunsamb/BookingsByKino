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

/**
 * Numéros mobile money de l'établissement — plusieurs opérateurs peuvent
 * être actifs en même temps (ex. M-Pesa ET Orange Money), chacun avec son
 * propre numéro et sa propre case à cocher. Communiqués manuellement par
 * le gérant au client une fois la demande validée (BR-3 : l'acompte est
 * payé directement au gérant, hors plateforme — phase 1, pas
 * d'intégration de paiement réelle, voir section 12.2 du cahier de
 * charge). Un opérateur décoché voit son numéro effacé, même s'il en
 * reste un dans le champ texte : la case à cocher fait foi.
 */
export async function updateMobileMoneyInfo(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return;
  if (profile.role !== "owner") return;

  function fieldValue(enabledField: string, numberField: string) {
    const enabled = formData.get(enabledField) === "on";
    const value = formData.get(numberField);
    if (!enabled || typeof value !== "string" || !value.trim()) return null;
    return value.trim();
  }

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({
      mpesa_number: fieldValue("mpesa_enabled", "mpesa_number"),
      orange_money_number: fieldValue(
        "orange_money_enabled",
        "orange_money_number"
      ),
      airtel_money_number: fieldValue(
        "airtel_money_enabled",
        "airtel_money_number"
      ),
    })
    .eq("id", profile.business_id);

  revalidatePath("/dashboard");
}
