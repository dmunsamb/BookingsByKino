"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewFormState } from "./actions";

export type Review = {
  id: string;
  client_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

const initialState: ReviewFormState = {};
const COMMENT_MAX_LENGTH = 500;

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
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

function ReviewForm() {
  const [state, formAction, pending] = useActionState(
    submitReview,
    initialState
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (state.success) {
    return (
      <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-ink-900 dark:text-paper">
        Merci, votre avis a été publié !
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-ink-900/10 bg-kino-50/60 p-4 dark:border-paper/10 dark:bg-ink-900/60"
    >
      <input type="hidden" name="rating" value={rating} />

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Votre note
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              className="p-0.5"
            >
              <svg
                viewBox="0 0 20 20"
                width={26}
                height={26}
                fill={n <= rating ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={1.2}
                className={n <= rating ? "text-kino-500" : "text-ink-900/20 dark:text-paper/20"}
              >
                <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L10 15l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Numéro de suivi
          </label>
          <input
            name="reference_number"
            type="text"
            required
            placeholder="ex: KB-000123"
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Numéro utilisé pour réserver
          </label>
          <input
            name="client_phone"
            type="tel"
            required
            placeholder="081 000 0000"
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label className="block text-xs font-bold uppercase tracking-widest text-ink-400">
            Commentaire (optionnel)
          </label>
          <span className="text-xs text-ink-400">
            {comment.length}/{COMMENT_MAX_LENGTH}
          </span>
        </div>
        <textarea
          name="comment"
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Votre expérience..."
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      {state.error && (
        <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="w-full rounded-xl bg-kino-400 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending ? "Envoi..." : "Publier mon avis"}
      </button>
    </form>
  );
}

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  const [showForm, setShowForm] = useState(false);
  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="mb-6 rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
            Avis clients
          </p>
          {reviews.length > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={Math.round(average)} size={18} />
              <span className="text-sm font-bold text-ink-900 dark:text-paper">
                {average.toFixed(1)}
              </span>
              <span className="text-xs text-ink-400">
                ({reviews.length} avis)
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-400">Aucun avis pour l&apos;instant.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="whitespace-nowrap rounded-xl border border-ink-900/16 px-3 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
        >
          {showForm ? "Annuler" : "Laisser un avis"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4">
          <ReviewForm />
        </div>
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
