import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase pour Server Components / Route Handlers, avec la session de
 * l'utilisateur connecté (basée sur les cookies). Utilise la clé publique
 * (anon key) — les droits réels sont appliqués par les policies RLS en
 * fonction de l'utilisateur authentifié (voir migrations 0002).
 *
 * À ne jamais utiliser pour des opérations privilégiées : voir admin.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component sans possibilité d'écrire des
            // cookies (pas de réponse HTTP à modifier) — sans conséquence tant
            // que le rafraîchissement de session est aussi géré par le middleware.
          }
        },
      },
    }
  );
}
