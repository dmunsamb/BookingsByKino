import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

/**
 * Étape 2 de la réinitialisation : arrivée ici seulement via le lien email
 * (redirigé par /auth/confirm, qui établit la session "recovery"). Sans
 * session valide (lien déjà utilisé, expiré, ou page ouverte directement),
 * on affiche un message plutôt que le formulaire.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-4 py-16 dark:bg-ink-900">
      <div className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-8 shadow-sm dark:border-paper/10 dark:bg-ink-800">
        <div className="mb-6">
          <span className="font-serif text-xl text-ink-900 dark:text-paper">
            KinoBooking
          </span>
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink-900 dark:text-paper">
          Nouveau mot de passe
        </h1>

        {user ? (
          <>
            <p className="mb-6 text-sm text-ink-400">
              Choisissez votre nouveau mot de passe.
            </p>
            <NewPasswordForm />
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">
            Ce lien n&apos;est plus valide (déjà utilisé ou expiré). Merci de{" "}
            <Link href="/mot-de-passe-oublie" className="font-bold underline">
              refaire une demande
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
