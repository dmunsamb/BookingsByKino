import { assignStaffToQueue } from "./queue-actions";

/**
 * "Prise en charge" (US demandée) : sélectionner un membre de l'équipe
 * fait passer un ticket de la file d'attente à "En cours" (voir
 * dashboard/page.tsx — pas de nouveau statut, juste staff_id renseigné).
 * Formulaire serveur simple, sans interactivité client nécessaire.
 */
export function AssignStaffForm({
  entryId,
  staff,
}: {
  entryId: string;
  staff: { id: string; name: string }[];
}) {
  if (staff.length === 0) {
    return (
      <p className="text-xs text-ink-400">Aucun membre d&apos;équipe actif.</p>
    );
  }

  return (
    <form action={assignStaffToQueue} className="flex items-center gap-2">
      <input type="hidden" name="id" value={entryId} />
      <select
        name="staff_id"
        required
        defaultValue=""
        className="rounded-xl border border-ink-900/16 bg-white p-2 text-xs text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
      >
        <option value="" disabled>
          Choisir...
        </option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-xl bg-kino-400 px-3 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
      >
        Prise en charge
      </button>
    </form>
  );
}
