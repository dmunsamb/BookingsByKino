import { CATEGORIES } from "@/lib/categories";

/**
 * Un établissement peut cocher plusieurs catégories (ex: salon de
 * coiffure ET salon de beauté) — d'où des checkbox partageant le même
 * name="categories" plutôt qu'un <select> à choix unique.
 */
export function CategoryCheckboxes({
  defaultValues = [],
}: {
  defaultValues?: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
        Catégories
      </label>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <label
            key={c.value}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-900/16 px-3 py-2 text-sm text-ink-900 has-[:checked]:border-kino-500 has-[:checked]:bg-kino-400 has-[:checked]:text-ink-900 has-[:checked]:font-bold dark:border-paper/16 dark:text-paper"
          >
            <input
              type="checkbox"
              name="categories"
              value={c.value}
              defaultChecked={defaultValues.includes(c.value)}
              className="accent-kino-500"
            />
            {c.value}
          </label>
        ))}
      </div>
    </div>
  );
}
