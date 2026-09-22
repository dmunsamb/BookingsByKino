"use client";

import { useActionState, useState } from "react";
import { submitReviewByToken, type ReviewFormState } from "./actions";

const initialState: ReviewFormState = {};
const COMMENT_MAX_LENGTH = 500;

export function ReviewForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    submitReviewByToken.bind(null, token),
    initialState
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (state.success) {
    return (
      <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-center text-sm text-ink-900 dark:text-paper">
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
        <label className="mb-2 block text-center text-xs font-bold uppercase tracking-widest text-ink-400">
          Votre note
        </label>
        <div className="flex justify-center gap-1">
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
                width={32}
                height={32}
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
          rows={4}
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
        className="w-full rounded-xl bg-kino-400 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Publier mon avis"}
      </button>
    </form>
  );
}
