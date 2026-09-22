"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";

/** Suppression d'un avis abusif — publication immédiate des avis (décision produit), pas de modération avant publication, donc seul ce filet après coup. */
export async function deleteReview(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !canManageBusiness(profile)) return;

  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase
    .from("business_reviews")
    .delete()
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard/avis");
}
