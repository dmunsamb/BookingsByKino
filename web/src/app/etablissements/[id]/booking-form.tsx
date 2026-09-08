"use client";

import { useActionState } from "react";
import { createBookingRequest, type BookingFormState } from "./actions";
import type { Slot } from "@/lib/availability";
import { formatCdf } from "@/lib/currency";

export type Service = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  duration_minutes: number;
  price_usd: number;
  deposit_usd: number;
};

const initialState: BookingFormState = {};

export function BookingForm({
  businessId,
  mainCategory,
  service,
  date,
  slots,
}: {
  businessId: string;
  mainCategory: string;
  service: Service;
  date: string;
  slots: Slot[];
}) {
  const [state, formAction, pending] = useActionState(
    createBookingRequest,
    initialState
  );
  const hasAvailableSlot = slots.some((s) => s.available);

  return (
    <div className="space-y-6">
      <form method="GET" className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Date souhaitée
          </label>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
        >
          Voir les créneaux
        </button>
      </form>

      <form
        action={formAction}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
          <input type="hidden" name="business_id" value={businessId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="service_id" value={service.id} />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              {mainCategory === "horeca" ? "Table ou espace" : "Prestation"}
            </label>
            <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
              {service.name} — ${service.price_usd.toFixed(2)}
            </p>
            {service.description && (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {service.description}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Créneau disponible le {date}
            </label>
            {slots.length === 0 && (
              <p className="text-sm text-slate-400">
                Aucun horaire configuré pour ce jour par cet établissement.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <label
                  key={slot.time}
                  className={`rounded-xl border px-3 py-2 text-sm has-[:checked]:border-kino-500 has-[:checked]:bg-kino-50 has-[:checked]:font-bold dark:has-[:checked]:bg-kino-950 ${
                    slot.available
                      ? "cursor-pointer border-slate-300 dark:border-slate-700"
                      : "cursor-not-allowed border-slate-100 text-slate-300 line-through dark:border-slate-800 dark:text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={`${slot.time}|${slot.slotDurationMinutes}`}
                    disabled={!slot.available}
                    required
                    className="sr-only"
                  />
                  {slot.time}
                </label>
              ))}
            </div>
          </div>

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

          <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-3 text-xs text-white">
            <span className="text-slate-300">
              Acompte requis après validation :
            </span>
            <span className="font-extrabold text-kino-400">
              {formatCdf(service.deposit_usd)} ($
              {service.deposit_usd.toFixed(2)})
            </span>
          </div>

          {state.error && (
            <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !hasAvailableSlot}
            className="w-full rounded-xl bg-kino-500 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Envoyer la demande gratuite"}
          </button>
      </form>
    </div>
  );
}
