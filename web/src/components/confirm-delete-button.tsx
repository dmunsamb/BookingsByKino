"use client";

import { useState } from "react";

/**
 * Bouton de suppression à double confirmation : un premier clic arme le
 * bouton ("Confirmer ?" / "Annuler"), un second clic dans cet état
 * soumet réellement le formulaire parent. Doit être utilisé à l'intérieur
 * d'un <form action={...}> — voir dashboard/agenda et dashboard/catalogue.
 */
export function ConfirmDeleteButton({ label = "Supprimer" }: { label?: string }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="submit"
          className="text-xs font-bold text-red-600 hover:underline"
        >
          Confirmer ?
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs font-bold text-slate-400 hover:underline"
        >
          Annuler
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-bold text-red-600 hover:underline"
    >
      {label}
    </button>
  );
}
