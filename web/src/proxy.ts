import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase à chaque requête (nécessaire avec
 * @supabase/ssr pour que les cookies d'auth restent valides côté serveur).
 * Voir https://supabase.com/docs/guides/auth/server-side/nextjs pour le
 * patron d'origine.
 *
 * Renommé de "middleware" vers "proxy" (Next.js 16) : même fonctionnalité,
 * nouvelle convention de nommage.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Force le rafraîchissement du token si nécessaire — à appeler avant toute
  // réponse, sinon un token rafraîchi après coup serait perdu (voir le
  // commentaire dans @supabase/ssr sur setAll).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
