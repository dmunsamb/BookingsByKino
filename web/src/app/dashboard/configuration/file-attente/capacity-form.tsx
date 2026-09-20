"use client";

import { useActionState } from "react";
import {
  updateWalkinQueueCapacity,
  type WalkinQueueCapacityFormState,
} from "./actions";

const initialState: WalkinQueueCapacityFormState = {};

export function CapacityForm({
  currentCapacity,
}: {
  currentCapacity: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateWalkinQueueCapacity,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Capacité (vide = illimitée)
        </label>
        <input
          type="number"
          name="walkin_queue_capacity"
          min={1}
          defaultValue={currentCapacity ?? ""}
          placeholder="Illimitée"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-kino-400 px-4 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
      {state.error && (
        <p className="text-xs text-danger sm:basis-full">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs font-bold text-success sm:basis-full">
          Enregistré.
        </p>
      )}
    </form>
  );
}
