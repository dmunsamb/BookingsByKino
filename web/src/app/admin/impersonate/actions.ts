"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  startImpersonation,
  endImpersonation,
  type ActingRole,
} from "@/lib/impersonation";

/**
 * Démarre une session "voir en tant que" — appelée uniquement depuis le
 * formulaire de choix de rôle (impersonate/[businessId]/page.tsx).
 * getCurrentProfile() ici renvoie encore le VRAI profil : pas de cookie
 * d'impersonation posé avant cet appel.
 */
export async function startImpersonationAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const businessId = formData.get("business_id");
  const actingRoleRaw = formData.get("acting_role");
  if (
    typeof businessId !== "string" ||
    (actingRoleRaw !== "owner" && actingRoleRaw !== "staff")
  ) {
    redirect("/admin");
  }
  const actingRole = actingRoleRaw as ActingRole;

  if (profile.role !== "platform_admin" && profile.role !== "sales") {
    redirect("/dashboard");
  }

  if (profile.role === "sales") {
    const supabase = await createClient();
    const { data: assignment } = await supabase
      .from("business_sales_reps")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!assignment) redirect("/admin");
  }

  await startImpersonation({ adminId: profile.id, businessId, actingRole });
  redirect("/dashboard");
}

export async function endImpersonationAction() {
  await endImpersonation();
  redirect("/admin");
}
