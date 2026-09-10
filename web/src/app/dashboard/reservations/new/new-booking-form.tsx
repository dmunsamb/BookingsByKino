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
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Date
        </label>
        <input
          type="date"
          name="date"
          defaultValue={date}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </form>

      <form
        action={formAction}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <input type="hidden" name="service_id" value={serviceId} />
        <input type="hidden" name="date" value={date} />

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Prestation
          </label>
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
            {serviceName}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Créneau disponible le {formatDateEuropean(date)}
          </label>
          {slots.length === 0 && (
            <p className="text-sm text-slate-400">
              Aucun horaire configuré pour ce jour.
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
              Nom du client
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
              Téléphone
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
          disabled={pending || !hasAvailableSlot}
          className="w-full rounded-xl bg-kino-500 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
        >
          {pending ? "Création..." : "Créer la réservation"}
        </button>
      </form>
    </div>
  );
}
