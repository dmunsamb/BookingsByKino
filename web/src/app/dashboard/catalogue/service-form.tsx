"use client";

import { useActionState } from "react";
import { createService, type ServiceFormState } from "./actions";

const initialState: ServiceFormState = {};

export function ServiceForm() {
  const [state, formAction, pending] = useActionState(
    createService,
    initialState
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 sm:grid-cols-3 dark:border-paper/10 dark:bg-ink-800"
    >
      <div className="col-span-full sm:col-span-2">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nom du service
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="ex: Pose Tissage + Closure HD"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Catégorie
        </label>
        <input
          type="text"
          name="category"
          placeholder="ex: Tresses & Braids"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div className="col-span-full">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Description (visible par le client)
        </label>
        <textarea
          name="description"
          rows={2}
          placeholder="Ce qui est inclus, durée approximative, etc."
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Durée (min)
        </label>
        <input
          type="number"
          name="duration_minutes"
          min={1}
          required
          defaultValue={60}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Prix total ($)
        </label>
        <input
          type="number"
          name="price_usd"
          min={0}
          step="0.01"
          required
          defaultValue={30}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Acompte ($)
        </label>
        <input
          type="number"
          name="deposit_usd"
          min={0}
          step="0.01"
          required
          defaultValue={10}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      {state.error && (
        <p className="col-span-full rounded-xl bg-danger/10 p-2 text-xs text-danger">
          {state.error}
        </p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-kino-400 px-4 py-2 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
        >
          {pending ? "Ajout..." : "Ajouter au catalogue"}
        </button>
      </div>
    </form>
  );
}
