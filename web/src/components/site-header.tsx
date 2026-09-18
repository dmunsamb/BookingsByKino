import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";

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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "platform_admin") {
      const { count } = await supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("signup_status", "pending_approval");
      pendingCount = count ?? 0;
    }
  }

  return (
    <header className="bg-ink-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl text-paper">KinoBooking</span>
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
          {!user && (
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
          <details className="group relative">
            <summary
              aria-label="Catégories"
              title="Catégories"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-paper/80 transition hover:bg-paper/10 hover:text-paper"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-ink-900/10 bg-white p-2 shadow-lg dark:border-paper/10 dark:bg-ink-800">
              <Link
                href="/"
                className="block rounded-xl px-3 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:text-paper dark:hover:bg-paper/10"
              >
                Toutes les catégories
              </Link>
              {CATEGORIES.map((c) => (
                <Link
                  key={c.value}
                  href={{ pathname: "/", query: { category: c.value } }}
                  className="block rounded-xl px-3 py-2 text-sm text-ink-900 hover:bg-ink-900/5 dark:text-paper dark:hover:bg-paper/10"
                >
                  {c.value}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
