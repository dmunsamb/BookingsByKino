import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase privilégié (service role key) — CONTOURNE le RLS.
 *
 * À utiliser UNIQUEMENT dans du code serveur (API routes / Route Handlers) qui
 * doit effectuer une opération que RLS interdirait volontairement à
 * l'utilisateur courant (ex. : onboarding d'une nouvelle zaak par le
 * platformbeheerder, création d'un profil). Ne jamais exposer ce client ou sa
 * clé au navigateur (voir docs/functioneel-ontwerp-kinobooking.md, section 13.6).
 *
 * Le package `server-only` fait échouer le build si ce fichier est importé,
 * même indirectement, depuis du code destiné au client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
