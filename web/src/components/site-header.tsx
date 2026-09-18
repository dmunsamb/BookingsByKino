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
    <header className="bg-ink-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl text-paper">KinoBooking</span>
        </Link>
        {pendingCount > 0 && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full bg-kino-900 px-3 py-1 text-xs font-bold text-kino-200 transition hover:bg-kino-800"
          >
            <span className="h-2 w-2 rounded-full bg-kino-400" />
            {pendingCount} inscription{pendingCount > 1 ? "s" : ""} en attente
          </Link>
        )}
      </div>
    </header>
  );
}
