import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour le navigateur (Client Components).
 * Utilise uniquement la clé publique (anon key) — la sécurité repose sur les
 * policies RLS définies dans supabase/migrations/0002_rls_policies.sql, pas sur
 * ce client (voir docs/functioneel-ontwerp-kinobooking.md, section 13.6).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
