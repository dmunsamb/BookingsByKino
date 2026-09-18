"use client";

import { useActionState } from "react";
import { createManualBooking, type NewBookingFormState } from "./actions";
import type { Slot } from "@/lib/availability";

const initialState: NewBookingFormState = {};

function formatDateEuropean(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function NewBookingForm({
  serviceId,
  serviceName,
  date,
  slots,
}: {
  serviceId: string;
  serviceName: string;
  date: string;
  slots: Slot[];
}) {
  const [state, formAction, pending] = useActionState(
    createManualBooking,
    initialState
  );
  const hasAvailableSlot = slots.some((s) => s.available);

  return (
    <div className="space-y-6">
      <form method="GET">
        <input type="hidden" name="service" value={serviceId} />
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Date
        </label>
        <input
          type="date"
          name="date"
          defaultValue={date}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </form>

      <form
        action={formAction}
        className="space-y-5 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800"
      >
        <input type="hidden" name="service_id" value={serviceId} />
        <input type="hidden" name="date" value={date} />

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Prestation
          </label>
          <p className="rounded-xl bg-kino-50 p-3 text-sm font-bold text-ink-900 dark:bg-ink-900 dark:text-paper">
            {serviceName}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Créneau disponible le {formatDateEuropean(date)}
          </label>
          {slots.length === 0 && (
            <p className="text-sm text-ink-400">
              Aucun horaire configuré pour ce jour.
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
              Nom du client
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
              Téléphone
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
          disabled={pending || !hasAvailableSlot}
          className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
        >
          {pending ? "Création..." : "Créer la réservation"}
        </button>
      </form>
    </div>
  );
}
