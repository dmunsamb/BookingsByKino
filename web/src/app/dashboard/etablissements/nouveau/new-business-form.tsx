"use client";

import { useActionState } from "react";
import { createAdditionalBusiness, type NewBusinessFormState } from "../actions";
import { CATEGORIES } from "@/lib/categories";
import { KINSHASA_COMMUNES } from "@/lib/communes";

const initialState: NewBusinessFormState = {};

export function NewBusinessForm() {
  const [state, formAction, pending] = useActionState(
    createAdditionalBusiness,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nom de l&apos;établissement
        </label>
        <input
          name="business_name"
          type="text"
          required
          placeholder="ex: Salon Nouschka II"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Commune
          </label>
          <select
            name="commune"
            defaultValue=""
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          >
            <option value="">Choisir...</option>
            {KINSHASA_COMMUNES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Ville
          </label>
          <input
            name="city"
            type="text"
            placeholder="ex: Kinshasa"
            defaultValue="Kinshasa"
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
        {pending ? "Création..." : "Ajouter cet établissement"}
      </button>
    </form>
  );
}
