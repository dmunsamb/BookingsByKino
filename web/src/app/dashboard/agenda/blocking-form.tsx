"use client";

import { useActionState } from "react";
import { createBlockingEntry, type BlockFormState } from "./actions";

const initialState: BlockFormState = {};

export function BlockingForm() {
  const [state, formAction, pending] = useActionState(
    createBlockingEntry,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4 sm:items-end"
    >
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Date
        </label>
        <input
          type="date"
          name="date"
          required
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          De
        </label>
        <input
          type="time"
          name="start_time"
          required
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          À
        </label>
        <input
          type="time"
          name="end_time"
          required
          className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
      >
        {pending ? "Blocage..." : "Bloquer ce créneau"}
      </button>
      {state.error && (
        <p className="text-xs font-bold text-red-600 sm:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}
