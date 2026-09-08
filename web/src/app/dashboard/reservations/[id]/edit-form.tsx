"use client";

import { useActionState } from "react";
import { updateBooking, type EditBookingFormState } from "./actions";
import type { Slot } from "@/lib/availability";

export type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  price_usd: number;
};

const initialState: EditBookingFormState = {};

function formatDateEuropean(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function EditBookingForm({
  bookingId,
  services,
  selectedServiceId,
  date,
  slots,
  currentSlotValue,
  clientName,
  clientPhone,
}: {
  bookingId: string;
  services: ServiceOption[];
  selectedServiceId: string;
  date: string;
  slots: Slot[];
  currentSlotValue: string | null;
  clientName: string;
  clientPhone: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateBooking,
    initialState
  );

  return (
    <div className="space-y-6">
      <form method="GET" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            Prestation
          </label>
          <select
            name="service"
            defaultValue={selectedServiceId}
            className="w-full rounded-xl border border-slate-300 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.duration_minutes} min — ${s.price_usd.toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Date
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
            Actualiser les disponibilités
          </button>
        </div>
      </form>

      <form
        action={formAction}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="service_id" value={selectedServiceId} />
        <input type="hidden" name="date" value={date} />

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
            {slots.map((slot) => {
              const value = `${slot.time}|${slot.slotDurationMinutes}`;
              const isCurrent = value === currentSlotValue;
              return (
                <label
                  key={slot.time}
                  className={`rounded-xl border px-3 py-2 text-sm has-[:checked]:border-kino-500 has-[:checked]:bg-kino-50 has-[:checked]:font-bold dark:has-[:checked]:bg-kino-950 ${
                    slot.available || isCurrent
                      ? "cursor-pointer border-slate-300 dark:border-slate-700"
                      : "cursor-not-allowed border-slate-100 text-slate-300 line-through dark:border-slate-800 dark:text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={value}
                    defaultChecked={isCurrent}
                    disabled={!slot.available && !isCurrent}
                    required
                    className="sr-only"
                  />
                  {slot.time}
                </label>
              );
            })}
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
              defaultValue={clientName}
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
              defaultValue={clientPhone}
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
          {pending ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
    </div>
  );
}
