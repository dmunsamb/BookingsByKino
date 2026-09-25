import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { readImpersonation } from "@/lib/impersonation";
import { HeaderMenu } from "./header-menu";
import { KinoBookingLockup } from "./kino-booking-logo";

/**
 * En-tête persistant sur toutes les pages : logo cliquable vers l'accueil.
 * Corrige l'absence de chemin de retour depuis le dashboard vers la
 * homepage. N'affiche que le prénom (premier mot du nom complet) : plus
 * lisible sur mobile, où le nom complet était souvent tronqué.
 *
 * La notification (inscriptions en attente pour platform_admin) n'est
 * plus un badge dans le header : voir NotificationBanner ci-dessous,
 * rendue juste en dessous du header (visible sur toutes les pages tant
 * qu'il y a quelque chose à traiter, pas seulement au clic).
 *
 * Utilise directement supabase.auth.getUser() (jamais getCurrentProfile,
 * qui redirige vers /login) : ce composant est aussi rendu pour les
 * visiteurs anonymes sur les pages publiques.
 */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let firstName: string | null = null;
  // Par défaut /dashboard (gérant/personnel) — platform_admin/sales n'ont
  // de business_id "actif" que pendant une session "voir en tant que" (voir
  // lib/impersonation.ts) : sans ça, /dashboard leur affiche juste "Accès
  // réservé" tant qu'ils n'ont pas ouvert un salon depuis /admin.
  let homeHref = "/dashboard";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    displayName = profile?.full_name ?? user.email ?? null;
    firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? displayName;

    if (profile?.role === "platform_admin" || profile?.role === "sales") {
      const impersonation = await readImpersonation(user.id);
      homeHref = impersonation ? "/dashboard" : "/admin";
    }
  }

  return (
    <header className="bg-ink-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <KinoBookingLockup size={20} onDark />
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href={homeHref}
              className="max-w-[10rem] truncate rounded-full px-3 py-1.5 text-sm font-bold text-paper transition hover:bg-paper/10"
              title={displayName ?? undefined}
            >
              {firstName}
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Connexion professionnelle"
              title="Connexion professionnelle (gérant / personnel)"
              className="flex h-9 w-9 items-center justify-center rounded-full text-paper/80 transition hover:bg-paper/10 hover:text-paper"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20c1.4-3.6 4.5-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
              </svg>
            </Link>
          )}
          <HeaderMenu
            faqHref={user ? "/faq-gerants" : "/faq"}
            faqSectionLabel={user ? "Gérants" : "Aide"}
          />
        </div>
      </div>
    </header>
  );
}
