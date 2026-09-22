export type Review = {
  id: string;
  client_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function averageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} sur 5 étoiles`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          width={size}
          height={size}
          fill={n <= rating ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.2}
          className={n <= rating ? "text-kino-500" : "text-ink-900/20 dark:text-paper/20"}
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Liste des avis clients, en lecture seule : publier un avis n'est possible
 * que via le lien à usage unique envoyé par le gérant après le service
 * (voir /avis/[token]) — jamais depuis un bouton ici, pour garantir qu'un
 * avis correspond toujours à une prestation réellement rendue.
 */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <div className="mb-6 rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Avis clients
      </p>

      {reviews.length === 0 && (
        <p className="text-sm text-ink-400">Aucun avis pour l&apos;instant.</p>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.slice(0, 10).map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-ink-900/8 p-3 dark:border-paper/8"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold text-ink-900 dark:text-paper">
                  {r.client_name || "Client"}
                </span>
                <Stars rating={r.rating} />
              </div>
              {r.comment && (
                <p className="text-sm leading-relaxed text-ink-400">
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
