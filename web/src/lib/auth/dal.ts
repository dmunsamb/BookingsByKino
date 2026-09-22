import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readImpersonation, type ActingRole } from "@/lib/impersonation";

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
  role: "owner" | "staff" | "platform_admin" | "sales";
  is_manager: boolean;
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
 * Le vrai profil du compte connecté, jamais modifié par le mode "voir en
 * tant que" — c'est CE profil qui sert à vérifier le droit d'entrer/rester
 * en impersonation, et à distinguer platform_admin (exempté des blocages,
 * voir isImpersonationRestricted) d'un sales impersonant.
 */
const fetchRealProfile = cache(async (): Promise<Profile | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, business_id, full_name, role, is_manager")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
});

/**
 * Alias public de fetchRealProfile — à utiliser dans tout /admin/**
 * (page + server actions). /admin est le panneau de contrôle de
 * l'admin/sales LUI-MÊME : il doit rester utilisable avec les vrais
 * droits du compte connecté même pendant une session "voir en tant que"
 * ouverte ailleurs (sinon un admin qui a une session active resterait
 * bloqué hors de /admin tant qu'il n'a pas cliqué "Quitter" — piège
 * repéré en relisant l'impersonation). Seul /dashboard/** doit lire le
 * profil effectif via getCurrentProfile().
 */
export const getRealProfile = fetchRealProfile;

/**
 * Renvoie le profil "effectif" de l'utilisateur connecté : son propre
 * profil normalement, ou — s'il est platform_admin/sales et a un cookie
 * "voir en tant que" valide (voir lib/impersonation.ts) — un profil dont
 * business_id/role sont ceux du salon/rôle choisis. C'est le seul point de
 * bascule : le reste du tableau de bord (dashboard/**) lit déjà
 * profile.business_id et canManageBusiness/isStaffMember partout, donc rien
 * d'autre à changer pour que l'impersonation "marche" sur toutes les pages.
 *
 * `null` signifie : connecté, mais sans profil KinoBooking associé (compte
 * mal configuré) — distinct du cas "pas connecté", qui redirige déjà vers
 * /login via requireUser().
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const real = await fetchRealProfile();
  if (!real) return null;

  if (real.role !== "platform_admin" && real.role !== "sales") return real;

  const impersonation = await readImpersonation(real.id);
  if (!impersonation) return real;

  if (real.role === "sales") {
    const supabase = await createClient();
    const { data: assignment } = await supabase
      .from("business_sales_reps")
      .select("business_id")
      .eq("business_id", impersonation.businessId)
      .eq("profile_id", real.id)
      .maybeSingle();
    // Le salon a pu être réassigné pendant la session en cours : on ne
    // fait pas confiance au cookie seul, on revérifie à chaque appel.
    if (!assignment) return real;
  }

  return {
    id: real.id,
    business_id: impersonation.businessId,
    full_name: real.full_name,
    role: impersonation.actingRole,
    // Jamais "gérant promu" en mode "voir en tant que personnel" : ce
    // mode sert à tester la vue restreinte, pas à hériter d'un droit
    // accordé au vrai personnel de CET établissement.
    is_manager: false,
  };
});

export type ImpersonationBanner = {
  businessId: string;
  businessName: string;
  actingRole: ActingRole;
  realRole: "platform_admin" | "sales";
};

/** Info d'affichage du bandeau persistant pendant une session "voir en tant que" — `null` si aucune session active. */
export const getImpersonationBanner = cache(
  async (): Promise<ImpersonationBanner | null> => {
    const real = await fetchRealProfile();
    if (!real || (real.role !== "platform_admin" && real.role !== "sales")) {
      return null;
    }

    const impersonation = await readImpersonation(real.id);
    if (!impersonation) return null;

    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", impersonation.businessId)
      .maybeSingle();
    if (!business) return null;

    return {
      businessId: business.id,
      businessName: business.name,
      actingRole: impersonation.actingRole,
      realRole: real.role,
    };
  }
);

/**
 * true si l'action en cours se fait pendant une session "voir en tant que"
 * PAR UN COMPTE AUTRE QUE LE SUPER ADMIN — décision produit explicite :
 * platform_admin (le seul, "moi seulement") reste libre-service partout ;
 * sales, lui, ne doit jamais pouvoir faire les actions sensibles listées
 * (suppression du compte, changement de mot de passe/email, changement des
 * coordonnées de paiement, suppression d'un membre du personnel, export des
 * données clients) — à appeler dans chaque action serveur concernée.
 */
export const isImpersonationRestricted = cache(async (): Promise<boolean> => {
  const real = await fetchRealProfile();
  if (!real || real.role === "platform_admin") return false;
  if (real.role !== "sales") return false;

  const impersonation = await readImpersonation(real.id);
  return impersonation !== null;
});

/**
 * platform_admin agit comme propriétaire universel de n'importe quel
 * établissement (même règle déjà appliquée côté RLS par is_owner_of,
 * voir migration 0002) — un même compte peut donc être à la fois
 * gérant d'un établissement précis ET super-administrateur KinoBooking.
 * Un membre du personnel promu "gérant" (is_manager, voir migration 0041
 * et dashboard/equipe) obtient exactement les mêmes droits, SAUF gérer
 * l'équipe elle-même (voir canManageTeam ci-dessous) — décision produit
 * explicite. À utiliser partout où l'UI ne réservait jusqu'ici une action
 * qu'au rôle "owner" strict.
 */
export function canManageBusiness(profile: Profile): boolean {
  return (
    profile.role === "owner" ||
    profile.role === "platform_admin" ||
    (profile.role === "staff" && profile.is_manager)
  );
}

/**
 * Gestion de l'équipe (ajouter/supprimer un membre, donner/retirer un
 * accès) : jamais délégable à un membre du personnel même promu "gérant"
 * — voir is_team_manager_of côté base (migration 0041), qui applique la
 * même restriction en RLS.
 */
export function canManageTeam(profile: Profile): boolean {
  return profile.role === "owner" || profile.role === "platform_admin";
}

/** owner, staff, ou platform_admin — toute personne autorisée à gérer l'agenda au quotidien. */
export function isStaffMember(profile: Profile): boolean {
  return (
    profile.role === "owner" ||
    profile.role === "staff" ||
    profile.role === "platform_admin"
  );
}
