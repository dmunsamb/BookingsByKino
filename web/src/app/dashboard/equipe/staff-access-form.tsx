"use client";

import { useActionState } from "react";
import { grantStaffAccess, type StaffAccessFormState } from "./actions";

const initialState: StaffAccessFormState = {};

/**
 * Octroi d'un accès dashboard (téléphone + mot de passe, pas d'email) à un
 * membre de l'équipe déjà créé — voir grantStaffAccess. Le rôle choisi ici
 * (coiffeur/coiffeuse ou gérant) peut être changé après coup depuis le
 * bouton "Passer gérant"/"Repasser coiffeur" une fois l'accès actif.
 */
export function StaffAccessForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState(
    grantStaffAccess,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-1 grid gap-2 rounded-xl border border-ink-900/10 bg-kino-50/60 p-3 dark:border-paper/10 dark:bg-ink-900/60 sm:grid-cols-2"
    >
      <input type="hidden" name="staff_id" value={staffId} />
      <input
        name="phone"
        type="tel"
        required
        placeholder="Téléphone (ex : 081 234 5678)"
        className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
      />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Mot de passe"
        className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
      />
      <div className="col-span-full flex items-center gap-4 text-xs text-ink-900 dark:text-paper">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="is_manager" value="off" defaultChecked />
          Coiffeur / Coiffeuse
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="is_manager" value="on" />
          Gérant
        </label>
      </div>
      {state.error && (
        <p className="col-span-full text-xs font-bold text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="col-span-full rounded-xl bg-kino-400 px-3 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Donner un accès"}
      </button>
    </form>
  );
}
