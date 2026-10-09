"use client";

import { useOptimistic, useTransition } from "react";
import { updateNotifyByEmail } from "./compte/actions";

/**
 * Même pattern optimiste que OnlineToggle (dashboard/configuration) —
 * voir ce fichier pour le raisonnement complet sur pourquoi pas un
 * simple <input defaultChecked> dans un <form>.
 */
export function NotifyEmailToggle({
  initialEnabled,
  label,
}: {
  initialEnabled: boolean;
  label: string;
}) {
  const [enabled, setEnabled] = useOptimistic(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      setEnabled(next);
      const formData = new FormData();
      formData.set("notify_by_email", next.toString());
      await updateNotifyByEmail(formData);
    });
  }

  return (
    <label className="flex items-center gap-3 rounded-xl border border-ink-900/16 p-3 text-sm text-ink-900 dark:border-paper/16 dark:text-paper">
      <input
        type="checkbox"
        checked={enabled}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-5 w-5 flex-none accent-kino-400 disabled:opacity-50"
      />
      {label}
    </label>
  );
}
