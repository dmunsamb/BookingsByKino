"use client";

import { useActionState } from "react";
import { createWalkInTicket, type WalkInFormState } from "./actions";

const initialState: WalkInFormState = {};

export function WalkInForm({
  businessId,
  serviceId,
  serviceName,
}: {
  businessId: string;
  serviceId: string;
  serviceName: string;
}) {
  const [state, formAction, pending] = useActionState(
    createWalkInTicket,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800"
    >
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="service_id" value={serviceId} />

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Prestation
        </label>
        <p className="rounded-xl bg-kino-50 p-3 text-sm font-bold text-ink-900 dark:bg-ink-900 dark:text-paper">
          {serviceName}
        </p>
      </div>

      <p className="rounded-xl border border-kino-200 bg-kino-50 p-3 text-xs text-ink-900 dark:border-kino-800 dark:bg-ink-900 dark:text-paper">
        Vous rejoignez la file d&apos;attente immédiatement, sans créneau ni
        acompte — présentez-vous sur place, votre tour viendra dans l&apos;ordre
        d&apos;arrivée.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Votre prénom
          </label>
          <input
            type="text"
            name="client_name"
            required
            placeholder="ex: Vanessa"
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Numéro WhatsApp
          </label>
          <input
            type="tel"
            name="client_phone"
            required
            placeholder="081 000 0000"
            className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
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
        {pending ? "Envoi..." : "Rejoindre la file d'attente"}
      </button>
    </form>
  );
}
