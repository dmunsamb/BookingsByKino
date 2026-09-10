import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-kino-500 to-amber-300 text-sm font-black text-slate-950">
            K
          </div>
          <span className="font-black text-slate-900 dark:text-white">
            Kino<span className="text-kino-500">Booking</span>
          </span>
        </Link>
        {pendingCount > 0 && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 transition hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {pendingCount} inscription{pendingCount > 1 ? "s" : ""} en attente
          </Link>
        )}
      </div>
    </header>
  );
}
