"use client";

import { useActionState } from "react";
import {
  createAvailabilityRule,
  type AvailabilityFormState,
} from "./actions";

const weekdayOptions = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

const initialState: AvailabilityFormState = {};

export function AvailabilityForm() {
  const [state, formAction, pending] = useActionState(
    createAvailabilityRule,
    initialState
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="col-span-2 sm:col-span-1">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Jour
        </label>
        <select
          name="weekday"
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {weekdayOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Début
        </label>
        <input
          type="time"
          name="start_time"
          required
          defaultValue="09:00"
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Fin
        </label>
        <input
          type="time"
          name="end_time"
          required
          defaultValue="17:00"
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Créneau (min)
        </label>
        <input
          type="number"
          name="slot_duration_minutes"
          min={5}
          required
          defaultValue={30}
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Capacité
        </label>
        <input
          type="number"
          name="capacity"
          min={1}
          required
          defaultValue={1}
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
          {pending ? "Ajout..." : "Ajouter ce créneau"}
        </button>
      </div>
    </form>
  );
}
