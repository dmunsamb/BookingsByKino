import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderMenu } from "./header-menu";
import { KinoBookingLockup } from "./kino-booking-logo";

/**
 * En-tête persistant sur toutes les pages : logo cliquable vers l'accueil.
 * Corrige l'absence de chemin de retour depuis le dashboard vers la
 * homepage.
 *
 * Affiche aussi, pour un platform_admin connecté, un badge du nombre
 * d'inscriptions en attente de validation — sans ça, rien ne prévenait
 * qu'un gérant venait de s'inscrire : il fallait penser à consulter
 * /admin manuellement. Le badge est visible sur toutes les pages
 * (dashboard, catalogue public...), pas seulement /admin.
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

  let pendingCount = 0;
  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    displayName = profile?.full_name ?? user.email ?? null;

    if (profile?.role === "platform_admin") {
      // Compte aussi "awaiting_payment" (approuvé sous conditions, en
      // attente de confirmation de paiement — voir migration 0030) :
      // sans ça, un gérant qui a payé pourrait rester bloqué sans accès
      // si l'admin oublie l'étape 2/2 faute de rappel visuel.
      const { count } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .in("signup_status", ["pending_approval", "awaiting_payment"]);
      pendingCount = count ?? 0;
    }
  }

  return (
    <header className="bg-ink-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <KinoBookingLockup size={20} onDark />
        </Link>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-full bg-kino-900 px-3 py-1 text-xs font-bold text-kino-200 transition hover:bg-kino-800"
            >
              <span className="h-2 w-2 rounded-full bg-kino-400" />
              {pendingCount} inscription{pendingCount > 1 ? "s" : ""} en
              attente
            </Link>
          )}
          {user ? (
            <Link
              href="/dashboard"
              className="max-w-[10rem] truncate rounded-full px-3 py-1.5 text-sm font-bold text-paper transition hover:bg-paper/10"
              title={displayName ?? undefined}
            >
              {displayName}
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
