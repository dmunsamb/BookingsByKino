"use client";

import { useOptimistic, useTransition } from "react";
import { toggleWalkinQueueOpen } from "./etablissement/actions";

/**
 * Case à cocher "file d'attente ouverte" (migration 0033) — même
 * mécanisme contrôlé + optimiste que OnlineToggle (voir online-toggle.tsx
 * pour le pourquoi : un <input defaultChecked> soumis via un <form>
 * classique donnait l'impression de "ne rien faire" sur un réseau lent).
 */
export function WalkinQueueToggle({ isOpen }: { isOpen: boolean }) {
  const [optimisticOpen, setOptimisticOpen] = useOptimistic(isOpen);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      setOptimisticOpen(next);
      const formData = new FormData();
      formData.set("walkin_queue_open", next.toString());
      await toggleWalkinQueueOpen(formData);
    });
  }

  return (
    <div
      className={`mb-6 flex items-center justify-between gap-4 rounded-2xl border p-4 sm:col-span-2 ${
        optimisticOpen
          ? "border-success/30 bg-success/10"
          : "border-kino-200 bg-kino-50 dark:border-kino-800 dark:bg-ink-800"
      }`}
    >
      <div>
        <p className="font-bold text-ink-900 dark:text-paper">
          {optimisticOpen
            ? "File d'attente ouverte"
            : "File d'attente fermée"}
        </p>
        <p className="text-sm text-ink-400">
          {optimisticOpen
            ? "Les clientes peuvent prendre un ticket sans rendez-vous."
            : "Aucun nouveau ticket sans rendez-vous accepté pour le moment."}
        </p>
      </div>
      <label className="flex flex-none items-center gap-2 text-sm font-bold text-ink-900 dark:text-paper">
        <input
          type="checkbox"
          checked={optimisticOpen}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.checked)}
          className="h-5 w-5 accent-success disabled:opacity-50"
        />
        Ouverte
      </label>
    </div>
  );
}
