"use client";

import { useActionState } from "react";
import { createSalesRep, type SalesRepFormState } from "./actions";

const initialState: SalesRepFormState = {};

/**
 * Le mot de passe généré n'est affiché qu'une seule fois, juste après la
 * création — comme n'importe quel "invite teammate" (Stripe, Supabase
 * lui-même) : ni stocké en clair, ni récupérable ensuite depuis l'UI.
 */
export function CreateSalesRepForm() {
  const [state, formAction, pending] = useActionState(
    createSalesRep,
    initialState
  );

  if (state.created) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
        <p className="mb-2 font-bold text-ink-900 dark:text-paper">
          Compte créé pour {state.created.email}
        </p>
        <p className="mb-1 text-xs text-ink-400">
          Mot de passe temporaire (à transmettre par WhatsApp — ne sera
          plus affiché) :
        </p>
        <p className="rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-ink-900 dark:bg-ink-900 dark:text-paper">
          {state.created.password}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800"
    >
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nom
        </label>
        <input
          name="full_name"
          type="text"
          required
          placeholder="ex: Prisca M."
          className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="prisca@kinobooking.cd"
          className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Création..." : "Ajouter un commercial"}
      </button>
      {state.error && (
        <p className="w-full text-xs text-danger">{state.error}</p>
      )}
    </form>
  );
}
