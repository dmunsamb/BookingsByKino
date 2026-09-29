"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type RequestResetState } from "./actions";

const initialState: RequestResetState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-4 py-16 dark:bg-ink-900">
      <div className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-8 shadow-sm dark:border-paper/10 dark:bg-ink-800">
        <div className="mb-6">
          <span className="font-serif text-xl text-ink-900 dark:text-paper">
            KinoBooking
          </span>
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink-900 dark:text-paper">
          Mot de passe oublié
        </h1>

        {state.success ? (
          <p className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-ink-900 dark:text-paper">
            Si un compte existe avec cet email, un lien de réinitialisation
            vient de lui être envoyé. Vérifiez aussi vos spams.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-ink-400">
              Indiquez l&apos;email de votre compte : vous recevrez un lien
              pour choisir un nouveau mot de passe.
            </p>

            <form action={formAction} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
                />
              </div>

              {state.error && (
                <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
              >
                {pending ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-xs text-ink-400">
          <Link
            href="/login"
            className="font-bold text-kino-600 hover:underline dark:text-kino-300"
          >
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
