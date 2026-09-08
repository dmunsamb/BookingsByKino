import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer pour l'authentification — voir le guide Next.js
 * (node_modules/next/dist/docs/01-app/02-guides/authentication.md) et
 * docs/functioneel-ontwerp-kinobooking.md (US-O1, US-S1, sectie 13.6).
 *
 * `cache()` évite de refaire la même requête plusieurs fois pendant un
 * rendu (Server Components, layout + page, etc.).
 */

export type Profile = {
  id: string;
  business_id: string | null;
  full_name: string | null;
  role: "owner" | "staff" | "platform_admin";
};

/** Redirige vers /login si personne n'est connecté ; sinon renvoie l'utilisateur Supabase Auth. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

/**
 * Renvoie le profil KinoBooking (rôle, établissement) de l'utilisateur connecté.
 * `null` signifie : connecté, mais sans profil KinoBooking associé (compte
 * mal configuré) — distinct du cas "pas connecté", qui redirige déjà vers
 * /login via requireUser().
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, business_id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
});
