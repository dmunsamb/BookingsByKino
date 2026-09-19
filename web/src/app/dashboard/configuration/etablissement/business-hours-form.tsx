"use client";

import { useActionState } from "react";
import {
  createBusinessHour,
  type BusinessHoursFormState,
} from "./business-hours-actions";

const weekdayOptions = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

const initialState: BusinessHoursFormState = {};

export function BusinessHoursForm() {
  const [state, formAction, pending] = useActionState(
    createBusinessHour,
    initialState
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 sm:grid-cols-4 dark:border-paper/10 dark:bg-ink-800"
    >
      <div className="col-span-full">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Jours (plusieurs choix possibles)
        </label>
        <div className="flex flex-wrap gap-2">
          {weekdayOptions.map((d) => (
            <label
              key={d.value}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-900/16 px-3 py-2 text-sm text-ink-900 has-[:checked]:border-kino-500 has-[:checked]:bg-kino-400 has-[:checked]:text-ink-900 has-[:checked]:font-bold dark:border-paper/16 dark:text-paper"
            >
              <input
                type="checkbox"
                name="weekday"
                value={d.value}
                className="accent-kino-500"
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Début
        </label>
        <input
          type="time"
          name="start_time"
          required
          defaultValue="09:00"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Fin
        </label>
        <input
          type="time"
          name="end_time"
          required
          defaultValue="17:00"
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
          {pending ? "Ajout..." : "Ajouter ces heures"}
        </button>
      </div>
    </form>
  );
}
