import { toggleBusinessOnline } from "./etablissement/actions";

/**
 * Toggle "en ligne" (migration 0031) — soumission directe en formulaire
 * (pas de useActionState) : rien à valider côté client, juste inverser
 * l'état actuel, même principe que toggleStaffActive sur /dashboard/equipe.
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
        <input type="hidden" name="is_online" value={(!isOnline).toString()} />
        <button
          type="submit"
          role="switch"
          aria-checked={isOnline}
          aria-label={isOnline ? "Passer hors ligne" : "Passer en ligne"}
          className={`relative h-7 w-12 flex-none rounded-full transition ${
            isOnline ? "bg-success" : "bg-ink-900/20 dark:bg-paper/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              isOnline ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </form>
    </div>
  );
}
