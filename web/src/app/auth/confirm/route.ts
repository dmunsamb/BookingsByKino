import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée des liens envoyés par email par Supabase Auth (réinitialisation
 * de mot de passe pour l'instant, potentiellement confirmation d'inscription
 * plus tard) — établit la session avant de rediriger vers la page indiquée
 * par `next`. Voir mot-de-passe-oublie/actions.ts pour l'émission du lien.
 *
 * Gère deux formats de lien selon la configuration du template d'email
 * Supabase : `token_hash` + `type` (template personnalisé pointant
 * directement ici) ou `code` (template par défaut, flux PKCE — Supabase
 * redirige alors vers cette URL avec ce paramètre après vérification côté
 * serveur Supabase).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/mot-de-passe-oublie?erreur=lien_invalide", origin)
  );
}
