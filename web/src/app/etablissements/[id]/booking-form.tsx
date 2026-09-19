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

function formatDateEuropean(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function BookingForm({
  businessId,
  mainCategory,
  service,
  date,
  minDate,
  slots,
}: {
  businessId: string;
  mainCategory: string;
  service: Service;
  date: string;
  minDate: string;
  slots: Slot[];
}) {
  const [state, formAction, pending] = useActionState(
    createBookingRequest,
    initialState
  );
  const hasAvailableSlot = slots.some((s) => s.available);

  return (
    <div className="space-y-6">
      <form method="GET">
        <input type="hidden" name="service" value={service.id} />
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Date souhaitée
        </label>
        <input
          type="date"
          name="date"
          defaultValue={date}
          min={minDate}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-800 dark:text-paper"
        />
        <p className="mt-1 text-xs text-ink-400">
          Réservation possible à partir de demain.
        </p>
      </form>

      <form
        action={formAction}
        className="space-y-5 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800"
      >
          <input type="hidden" name="business_id" value={businessId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="service_id" value={service.id} />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              {mainCategory === "horeca" ? "Table ou espace" : "Prestation"}
            </label>
            <p className="rounded-xl bg-kino-50 p-3 text-sm font-bold text-ink-900 dark:bg-ink-900 dark:text-paper">
              {service.name} — ${service.price_usd.toFixed(2)}
            </p>
            {service.description && (
              <p className="mt-2 rounded-xl bg-kino-50/60 p-3 text-xs leading-relaxed text-ink-400 dark:bg-ink-900/60">
                {service.description}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Créneau disponible le {formatDateEuropean(date)}
            </label>
            {slots.length === 0 && (
              <p className="text-sm text-ink-400">
                Aucun créneau disponible pour ce jour à cet établissement.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <label
                  key={slot.time}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-bold has-[:checked]:border-kino-500 has-[:checked]:bg-kino-400 has-[:checked]:text-ink-900 ${
                    slot.available
                      ? "cursor-pointer border-ink-900/16 text-ink-900 dark:border-paper/16 dark:text-paper"
                      : "cursor-not-allowed border-ink-900/8 text-ink-400 line-through dark:border-paper/8"
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

          <div className="flex items-center justify-between rounded-xl bg-ink-900 p-3.5 text-xs">
            <span className="text-ink-400">
              Acompte requis après validation :
            </span>
            <span className="font-bold text-kino-400">
              {formatCdf(service.deposit_usd)} ($
              {service.deposit_usd.toFixed(2)})
            </span>
          </div>

          {state.error && (
            <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !hasAvailableSlot}
            className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Envoyer la demande gratuite"}
          </button>
      </form>
    </div>
  );
}
