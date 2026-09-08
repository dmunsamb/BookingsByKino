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
      className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="col-span-full sm:col-span-2">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Nom du service
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="ex: Pose Tissage + Closure HD"
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Catégorie
        </label>
        <input
          type="text"
          name="category"
          placeholder="ex: Tresses & Braids"
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="col-span-full">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Description (visible par le client)
        </label>
        <textarea
          name="description"
          rows={2}
          placeholder="Ce qui est inclus, durée approximative, etc."
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Durée (min)
        </label>
        <input
          type="number"
          name="duration_minutes"
          min={1}
          required
          defaultValue={60}
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Prix total ($)
        </label>
        <input
          type="number"
          name="price_usd"
          min={0}
          step="0.01"
          required
          defaultValue={30}
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Acompte ($)
        </label>
        <input
          type="number"
          name="deposit_usd"
          min={0}
          step="0.01"
          required
          defaultValue={10}
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {state.error && (
        <p className="col-span-full rounded-xl bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-kino-500 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
        >
          {pending ? "Ajout..." : "Ajouter au catalogue"}
        </button>
      </div>
    </form>
  );
}
