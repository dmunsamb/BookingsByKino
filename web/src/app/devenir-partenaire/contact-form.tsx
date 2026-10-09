"use client";

import { useActionState } from "react";
import { submitContactMessage, type ContactFormState } from "./actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactMessage,
    initialState
  );

  if (state.success) {
    return (
      <p className="rounded-2xl border border-success/30 bg-success/10 p-4 text-center text-sm text-ink-900 dark:text-paper">
        Message envoyé. On vous répond rapidement, le plus souvent sur
        WhatsApp si vous avez laissé un numéro.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
        >
          Votre nom
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label
          htmlFor="contact-contact"
          className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
        >
          Email ou numéro WhatsApp
        </label>
        <input
          id="contact-contact"
          name="contact"
          type="text"
          required
          placeholder="ex: 081 000 0000"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400"
        >
          Votre question
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          maxLength={1000}
          placeholder="Une question avant de vous inscrire ?"
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
        disabled={pending}
        className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Envoyer"}
      </button>
    </form>
  );
}
