"use client";

import { useActionState } from "react";
import { addBusinessPhotos, type PhotoFormState } from "./actions";
import { ACCEPTED_PHOTO_TYPES } from "@/lib/media";

const initialState: PhotoFormState = {};

export function PhotoUploadForm() {
  const [state, formAction, pending] = useActionState(
    addBusinessPhotos,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Ajouter des photos
        </label>
        <input
          type="file"
          name="photos"
          accept={ACCEPTED_PHOTO_TYPES}
          multiple
          required
          className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 file:mr-3 file:rounded-lg file:border-0 file:bg-kino-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-kino-700 dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
        {state.error && (
          <p className="mt-1 text-xs font-bold text-danger">{state.error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-kino-400 px-4 py-2 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Ajouter"}
      </button>
    </form>
  );
}
