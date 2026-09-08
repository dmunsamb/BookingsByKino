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

export type MobileMoneyFormState = { success?: boolean; error?: string };

const MOBILE_MONEY_PROVIDER_INFO = [
  { key: "mpesa", label: "M-Pesa" },
  { key: "orange_money", label: "Orange Money" },
  { key: "airtel_money", label: "Airtel Money" },
] as const;

/**
 * Numéros mobile money de l'établissement — plusieurs opérateurs peuvent
 * être actifs en même temps (ex. M-Pesa ET Orange Money), chacun avec son
 * propre numéro et sa propre case à cocher. Communiqués manuellement par
 * le gérant au client une fois la demande validée (BR-3 : l'acompte est
 * payé directement au gérant, hors plateforme — phase 1, pas
 * d'intégration de paiement réelle, voir section 12.2 du cahier de
 * charge). Un opérateur décoché voit son numéro et son titulaire effacés,
 * même s'il en reste dans les champs texte : la case à cocher fait foi.
 *
 * Le nom du titulaire est obligatoire pour tout opérateur activé (évite
 * les litiges lors du transfert, voir demande du gérant) : revérifié ici
 * même si le formulaire l'empêche déjà côté client.
 */
export async function updateMobileMoneyInfo(
  _prevState: MobileMoneyFormState,
  formData: FormData
): Promise<MobileMoneyFormState> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) {
    return { error: "Aucun établissement associé à votre compte." };
  }
  if (profile.role !== "owner") {
    return { error: "Seul le gérant peut modifier ces informations." };
  }

  const updates: Record<string, string | null> = {};
  const missingNumber: string[] = [];
  const missingHolderName: string[] = [];

  for (const { key, label } of MOBILE_MONEY_PROVIDER_INFO) {
    const enabled = formData.get(`${key}_enabled`) === "on";

    if (!enabled) {
      updates[`${key}_number`] = null;
      updates[`${key}_holder_name`] = null;
      continue;
    }

    const numberRaw = formData.get(`${key}_number`);
    const holderNameRaw = formData.get(`${key}_holder_name`);
    const number = typeof numberRaw === "string" ? numberRaw.trim() : "";
    const holderName =
      typeof holderNameRaw === "string" ? holderNameRaw.trim() : "";

    if (!number) missingNumber.push(label);
    if (!holderName) missingHolderName.push(label);
    if (!number || !holderName) continue;

    updates[`${key}_number`] = number;
    updates[`${key}_holder_name`] = holderName;
  }

  if (missingNumber.length > 0 || missingHolderName.length > 0) {
    const parts: string[] = [];
    if (missingNumber.length > 0) {
      parts.push(`numéro manquant (${missingNumber.join(", ")})`);
    }
    if (missingHolderName.length > 0) {
      parts.push(`nom du titulaire manquant (${missingHolderName.join(", ")})`);
    }
    return { error: `Merci de compléter : ${parts.join(" · ")}.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", profile.business_id);

  if (error) {
    return { error: "Erreur lors de l'enregistrement. Merci de réessayer." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
