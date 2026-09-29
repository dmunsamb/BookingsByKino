import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée des liens envoyés par email par Supabase Auth (réinitialisation
 * de mot de passe pour l'instant, potentiellement confirmation d'inscription
 * plus tard) — vérifie le jeton (token_hash + type) et établit la session
 * avant de rediriger vers la page indiquée par `next`. Voir
 * mot-de-passe-oublie/actions.ts pour l'émission du lien.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/mot-de-passe-oublie?erreur=lien_invalide", origin)
  );
}
