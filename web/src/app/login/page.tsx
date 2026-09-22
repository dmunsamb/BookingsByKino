"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-4 py-16 dark:bg-ink-900">
      <div className="w-full max-w-sm rounded-2xl border border-ink-900/10 bg-white p-8 shadow-sm dark:border-paper/10 dark:bg-ink-800">
        <div className="mb-6">
          <span className="font-serif text-xl text-ink-900 dark:text-paper">
            KinoBooking
          </span>
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink-900 dark:text-paper">
          Espace Salon
        </h1>
        <p className="mb-6 text-sm text-ink-400">
          Connectez-vous avec le compte fourni par KinoBooking — email pour
          un gérant, numéro de téléphone pour un membre de l&apos;équipe.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="identifier"
              className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
            >
              Email ou téléphone
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
            {pending ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-400">
          Nouveau gérant ?{" "}
          <Link
            href="/inscription"
            className="font-bold text-kino-600 hover:underline dark:text-kino-300"
          >
            Créer un compte
          </Link>
        </p>
        <p className="mt-1 text-center text-xs text-ink-400">
          <Link
            href="/faq-gerants"
            className="font-bold text-kino-600 hover:underline dark:text-kino-300"
          >
            FAQ gérants
          </Link>
        </p>
      </div>
    </div>
  );
}
