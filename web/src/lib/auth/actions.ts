"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Déconnexion — dans lib/auth/ (pas dashboard/actions.ts) car utilisée
 * depuis le header (SiteHeader), présent sur TOUTES les pages (dashboard,
 * /admin, fiche établissement...), pas seulement /dashboard.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
