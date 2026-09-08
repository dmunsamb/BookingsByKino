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
