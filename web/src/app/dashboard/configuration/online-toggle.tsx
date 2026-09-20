"use client";

import { toggleBusinessOnline } from "./etablissement/actions";

/**
 * Case à cocher "en ligne" (migration 0031) — remplace l'ancien toggle
 * (switch visuel jugé peu réactif/clair) : cochée = en ligne, décochée =
 * hors ligne (état par défaut d'un nouveau salon). Soumission automatique
 * au clic (checkbox seule ne déclenche pas d'envoi de formulaire).
 */
export function OnlineToggle({ isOnline }: { isOnline: boolean }) {
  return (
    <div
      className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border p-4 sm:col-span-2 ${
        isOnline
          ? "border-success/30 bg-success/10"
          : "border-kino-200 bg-kino-50 dark:border-kino-800 dark:bg-ink-800"
      }`}
    >
      <div>
        <p className="font-bold text-ink-900 dark:text-paper">
          {isOnline ? "Salon en ligne" : "Salon hors ligne"}
        </p>
        <p className="text-sm text-ink-400">
          {isOnline
            ? "Visible et réservable par les clientes."
            : "Invisible du catalogue public — activez-le une fois votre catalogue et vos horaires prêts."}
        </p>
      </div>
      <form action={toggleBusinessOnline}>
        <label className="flex flex-none items-center gap-2 text-sm font-bold text-ink-900 dark:text-paper">
          <input
            type="checkbox"
            name="is_online"
            value="true"
            defaultChecked={isOnline}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="h-5 w-5 accent-success"
          />
          En ligne
        </label>
      </form>
    </div>
  );
}
