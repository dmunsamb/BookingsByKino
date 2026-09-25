import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Bannière fine et permanente, rendue juste sous le header sur toutes les
 * pages (voir layout.tsx) — remplace l'ancien badge dans SiteHeader : reste
 * visible tant qu'il y a une inscription à traiter, pas seulement au clic
 * sur /admin. `null` (rien de rendu) dès qu'il n'y a aucune notification,
 * pour ne pas occuper de place inutilement.
 */
export async function NotificationBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "platform_admin") return null;

  // Compte aussi "awaiting_payment" (approuvé sous conditions, en attente
  // de confirmation de paiement — voir migration 0030) : sans ça, un
  // gérant qui a payé pourrait rester bloqué sans accès si l'admin oublie
  // l'étape 2/2 faute de rappel visuel.
  const { count } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .in("signup_status", ["pending_approval", "awaiting_payment"]);

  const pendingCount = count ?? 0;
  if (pendingCount === 0) return null;

  return (
    <Link
      href="/admin"
      className="flex items-center justify-center gap-1.5 bg-kino-400 px-4 py-1.5 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
    >
      <span className="h-2 w-2 rounded-full bg-ink-900" />
      {pendingCount} inscription{pendingCount > 1 ? "s" : ""} en attente de
      traitement
    </Link>
  );
}
