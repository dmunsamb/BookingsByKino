import { shiftQueuePosition } from "./queue-actions";

/**
 * "Décaler" (US demandée) : le client demande à laisser passer 1, 2 ou 3
 * personnes sans perdre sa place définitivement — un seul décalage
 * autorisé par ticket (queue_shift_used, migration 0033).
 */
export function ShiftQueueButtons({
  entryId,
  used,
}: {
  entryId: string;
  used: boolean;
}) {
  if (used) {
    return (
      <span className="text-xs text-ink-400">Décalage déjà utilisé</span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-ink-400">Décaler :</span>
      {[1, 2, 3].map((n) => (
        <form key={n} action={shiftQueuePosition}>
          <input type="hidden" name="id" value={entryId} />
          <input type="hidden" name="positions" value={n} />
          <button
            type="submit"
            className="rounded-lg border border-ink-900/16 px-2 py-1 text-xs font-bold text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
          >
            +{n}
          </button>
        </form>
      ))}
    </div>
  );
}
