"use client";

import { useActionState } from "react";
import { createBlockingEntry, type BlockFormState } from "./actions";

const initialState: BlockFormState = {};

export function BlockingForm({
  staffMembers,
}: {
  staffMembers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createBlockingEntry,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mb-4 grid gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800 sm:grid-cols-4 sm:items-end"
    >
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Équipe
        </label>
        <select
          name="staff_id"
          defaultValue=""
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        >
          <option value="">Toute l&apos;équipe</option>
          {staffMembers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Date
        </label>
        <input
          type="date"
          name="date"
          required
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          De
        </label>
        <input
          type="time"
          name="start_time"
          required
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          À
        </label>
        <input
          type="time"
          name="end_time"
          required
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Blocage..." : "Bloquer ce créneau"}
      </button>
      {state.error && (
        <p className="text-xs font-bold text-danger sm:col-span-4">
          {state.error}
        </p>
      )}
    </form>
  );
}
