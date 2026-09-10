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
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="service_id" value={serviceId} />

      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Prestation
        </label>
        <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
          {serviceName}
        </p>
      </div>

      <p className="rounded-xl bg-kino-50 p-3 text-xs text-kino-900 dark:bg-kino-900 dark:text-kino-100">
        Vous rejoignez la file d&apos;attente immédiatement, sans créneau ni
        acompte — présentez-vous sur place, votre tour viendra dans l&apos;ordre
        d&apos;arrivée.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Votre prénom
          </label>
          <input
            type="text"
            name="client_name"
            required
            placeholder="ex: Vanessa"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Numéro WhatsApp
          </label>
          <input
            type="tel"
            name="client_phone"
            required
            placeholder="081 000 0000"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-kino-500 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Rejoindre la file d'attente"}
      </button>
    </form>
  );
}
