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
