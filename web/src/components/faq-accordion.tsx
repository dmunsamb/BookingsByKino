/**
 * Accordéon de FAQ, en pur CSS (<details>/<summary>, sans JavaScript) —
 * même principe que la galerie photo (etablissements/[id]/photo-gallery.tsx).
 * Partagé entre /faq (utilisateurs) et /faq-gerants.
 */
export function FaqAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <details
          key={item.question}
          className="group rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink-900 dark:text-paper">
            {item.question}
            <span className="text-ink-400 transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
