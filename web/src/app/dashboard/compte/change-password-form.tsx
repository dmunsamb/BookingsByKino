"use client";

import { useActionState } from "react";
import { changeOwnPassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeOwnPassword,
    initialState
  );

  if (state.success) {
    return (
      <p className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-bold text-ink-900 dark:text-paper">
        Mot de passe mis à jour.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800"
    >
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Mot de passe actuel
        </label>
        <input
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nouveau mot de passe
        </label>
        <input
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
        <p className="mt-1 text-xs text-ink-400">8 caractères minimum.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Confirmer le nouveau mot de passe
        </label>
        <input
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
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
        className="w-full rounded-xl bg-kino-400 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending ? "Enregistrement..." : "Changer le mot de passe"}
      </button>
    </form>
  );
}
