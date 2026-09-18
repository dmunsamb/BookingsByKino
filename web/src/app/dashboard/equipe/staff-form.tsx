"use client";

import { useActionState } from "react";
import { createStaffMember, type StaffFormState } from "./actions";

const initialState: StaffFormState = {};

export function StaffForm() {
  const [state, formAction, pending] = useActionState(
    createStaffMember,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mb-6 flex gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800"
    >
      <div className="flex-1">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nom
        </label>
        <input
          type="text"
          name="name"
          required
          placeholder="ex: Grâce"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
        {state.error && (
          <p className="mt-1 text-xs font-bold text-danger">{state.error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-end rounded-xl bg-kino-400 px-4 py-2 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Ajout..." : "Ajouter"}
      </button>
    </form>
  );
}
