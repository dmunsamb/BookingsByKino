"use client";

import { useActionState } from "react";
import { resetUserPassword, type ResetPasswordState } from "./actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

const initialState: ResetPasswordState = {};

/**
 * Bouton "Réinitialiser le mot de passe" réutilisable (établissements ET
 * équipe commerciale) — le nouveau mot de passe généré ne s'affiche
 * qu'une fois, ici même, jamais recalculable ensuite depuis l'UI.
 */
export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    resetUserPassword,
    initialState
  );

  if (state.newPassword) {
    return (
      <div className="text-xs">
        <p className="mb-1 text-ink-400">Nouveau mot de passe (WhatsApp) :</p>
        <p className="rounded-lg bg-kino-50 px-2 py-1 font-mono font-bold text-ink-900 dark:bg-ink-900 dark:text-paper">
          {state.newPassword}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={userId} />
      <ConfirmDeleteButton
        label={pending ? "..." : "Réinitialiser le mot de passe"}
        dismissLabel="Annuler"
      />
      {state.error && <p className="mt-1 text-danger">{state.error}</p>}
    </form>
  );
}
