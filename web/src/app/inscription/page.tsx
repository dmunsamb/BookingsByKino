"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "./actions";
import { CATEGORIES } from "@/lib/categories";
import { CityCommuneFields } from "@/components/city-commune-fields";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-4 py-12 dark:bg-ink-900">
      <div className="w-full max-w-md rounded-2xl border border-ink-900/10 bg-white p-8 shadow-sm dark:border-paper/10 dark:bg-ink-800">
        <h1 className="mb-1 text-lg font-bold text-ink-900 dark:text-paper">
          Créer votre compte gérant
        </h1>
        <p className="mb-6 text-sm text-ink-400">
          Votre établissement sera visible des clients après validation
          manuelle par l&apos;équipe KinoBooking.
        </p>

        <form
          action={formAction}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Votre nom
            </label>
            <input
              name="owner_name"
              type="text"
              required
              placeholder="ex: Sephora Mavinga"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Numéro WhatsApp (optionnel)
            </label>
            <input
              name="whatsapp"
              type="tel"
              placeholder="ex: 081 000 0000"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>

          <hr className="border-ink-900/10 dark:border-paper/10" />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Nom de l&apos;établissement
            </label>
            <input
              name="business_name"
              type="text"
              required
              placeholder="ex: Salon Nouschka"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Type d&apos;établissement
            </label>
            <select
              name="type"
              required
              defaultValue=""
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            >
              <option value="" disabled>
                Choisir...
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Adresse
            </label>
            <input
              name="address"
              type="text"
              placeholder="ex: Avenue Kasa-Vubu"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>

          <CityCommuneFields />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Logo (optionnel)
            </label>
            <input
              name="logo"
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Photos du salon (optionnel)
            </label>
            <input
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
            <p className="mt-1 text-xs text-ink-400">
              Visibles en défilement sur votre fiche établissement — vous
              pourrez en ajouter d&apos;autres plus tard depuis votre
              tableau de bord.
            </p>
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
            {pending ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-400">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-bold text-kino-600 hover:underline dark:text-kino-300">
            Se connecter
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
