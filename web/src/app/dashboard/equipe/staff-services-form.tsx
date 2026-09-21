import { updateStaffServices } from "./actions";

/**
 * Compétences d'un membre d'équipe (migration 0034) : services que cette
 * personne peut rendre. Tout décoché = qualifié pour tout (comportement
 * par défaut) — voir la note dans actions.ts et le filtrage appliqué à
 * la "prise en charge" dans dashboard/page.tsx.
 */
export function StaffServicesForm({
  staffId,
  services,
  selectedServiceIds,
}: {
  staffId: string;
  services: { id: string; name: string }[];
  selectedServiceIds: string[];
}) {
  if (services.length === 0) return null;

  return (
    <form
      action={updateStaffServices}
      className="w-full rounded-xl bg-kino-50 p-3 dark:bg-ink-900"
    >
      <input type="hidden" name="staff_id" value={staffId} />
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-400">
        Prestations réalisables (tout décoché = toutes)
      </p>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {services.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-1.5 text-xs text-ink-900 dark:text-paper"
          >
            <input
              type="checkbox"
              name="service_ids"
              value={s.id}
              defaultChecked={selectedServiceIds.includes(s.id)}
              className="h-4 w-4 accent-kino-400"
            />
            {s.name}
          </label>
        ))}
      </div>
      <button
        type="submit"
        className="text-xs font-bold text-kino-600 hover:underline dark:text-kino-300"
      >
        Enregistrer
      </button>
    </form>
  );
}
