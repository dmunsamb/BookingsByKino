"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">
          Créer votre compte gérant
        </h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Votre établissement sera visible des clients après validation
          manuelle par l&apos;équipe KinoBooking.
        </p>

        <form
          action={formAction}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Votre nom
            </label>
            <input
              name="owner_name"
              type="text"
              required
              placeholder="ex: Nouschka Mbelu"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Numéro WhatsApp (optionnel)
            </label>
            <input
              name="whatsapp"
              type="tel"
              placeholder="ex: 081 000 0000"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Nom de l&apos;établissement
            </label>
            <input
              name="business_name"
              type="text"
              required
              placeholder="ex: Salon Nouschka"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Type d&apos;établissement
            </label>
            <select
              name="type"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="" disabled>
                Choisir...
              </option>
              <option value="Salon de coiffure">Salon de coiffure</option>
              <option value="Salon de beauté">Salon de beauté</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Adresse
              </label>
              <input
                name="address"
                type="text"
                placeholder="ex: Avenue Kasa-Vubu"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Ville
              </label>
              <input
                name="city"
                type="text"
                placeholder="ex: Kinshasa"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Logo (optionnel)
            </label>
            <input
              name="logo"
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {state.error && (
            <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-kino-500 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
          >
            {pending ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-bold text-kino-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
