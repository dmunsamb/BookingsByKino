"use client";

import { useActionState } from "react";
import { setNewPassword, type SetPasswordState } from "./actions";

const initialState: SetPasswordState = {};

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(
    setNewPassword,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
        >
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label
          htmlFor="confirm_password"
          className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
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
        className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
