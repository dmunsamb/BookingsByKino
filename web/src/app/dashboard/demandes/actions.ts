"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/dal";

/**
 * Validation manuelle des demandes de réservation (FR-9.1, BR-11, phase 1).
 * L'écriture est de toute façon restreinte au personnel/gérant de
 * l'établissement côté base (policy staff_update_own_agenda) ; on revérifie
 * ici par prudence.
 */

export async function confirmRequest(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return;
  if (profile.role !== "owner" && profile.role !== "staff") return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("agenda_entries")
    .update({ status: "confirmed" })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard/demandes");
}

export async function refuseRequest(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return;
  if (profile.role !== "owner" && profile.role !== "staff") return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("agenda_entries")
    .update({ status: "geannuleerd" })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard/demandes");
}
