"use client";

import { useOptimistic, useTransition } from "react";
import { toggleBusinessOnline } from "./etablissement/actions";

/**
 * Case à cocher "en ligne" (migration 0031). Contrôlée + optimiste
 * (useOptimistic/useTransition) plutôt qu'un <input defaultChecked> non
 * contrôlé soumis via un <form> classique : ce dernier semblait "ne rien
 * faire" sur un réseau lent — defaultChecked ne se resynchronise jamais
 * depuis les props après le montage initial, donc rien ne redonnait de
 * retour visuel pendant l'aller-retour serveur, et des clics répétés
 * pouvaient partir en parallèle (état final imprévisible). Ici le clic
 * change l'affichage immédiatement, la case est désactivée le temps de
 * la requête (impossible de la redéclencher en double), et elle revient
 * en arrière d'elle-même si l'action échoue.
 */
export function OnlineToggle({ isOnline }: { isOnline: boolean }) {
  const [optimisticOnline, setOptimisticOnline] = useOptimistic(isOnline);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      setOptimisticOnline(next);
      const formData = new FormData();
      formData.set("is_online", next.toString());
      await toggleBusinessOnline(formData);
    });
  }

  return (
    <div
      className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border p-4 sm:col-span-2 ${
        optimisticOnline
          ? "border-success/30 bg-success/10"
          : "border-kino-200 bg-kino-50 dark:border-kino-800 dark:bg-ink-800"
      }`}
    >
      <div>
        <p className="font-bold text-ink-900 dark:text-paper">
          {optimisticOnline ? "Salon en ligne" : "Salon hors ligne"}
        </p>
        <p className="text-sm text-ink-400">
          {optimisticOnline
            ? "Visible et réservable par les clientes."
            : "Invisible du catalogue public — activez-le une fois votre catalogue et vos horaires prêts."}
        </p>
      </div>
      <label className="flex flex-none items-center gap-2 text-sm font-bold text-ink-900 dark:text-paper">
        <input
          type="checkbox"
          checked={optimisticOnline}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.checked)}
          className="h-5 w-5 accent-success disabled:opacity-50"
        />
        En ligne
      </label>
    </div>
  );
}
