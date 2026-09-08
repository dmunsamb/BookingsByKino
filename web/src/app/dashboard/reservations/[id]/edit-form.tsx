"use client";

import { useActionState } from "react";
import { updateBooking, type EditBookingFormState } from "./actions";
import type { Slot } from "@/lib/availability";

const initialState: EditBookingFormState = {};

function formatDateEuropean(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function EditBookingForm({
  bookingId,
  serviceName,
  clientName,
  date,
  slots,
  currentSlotValue,
}: {
  bookingId: string;
  serviceName: string;
  clientName: string;
  date: string;
  slots: Slot[];
  currentSlotValue: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateBooking,
    initialState
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-800">
        <p className="font-bold text-slate-900 dark:text-white">
          {clientName} — {serviceName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Seuls la date et l&apos;horaire peuvent être modifiés ici. Pour
          changer de prestation ou de client, annulez cette réservation et
          recréez-en une nouvelle.
        </p>
      </div>

      {/* Navigation GET pure : changer la date recharge la page avec les
          disponibilités du nouveau jour (même service, même durée). Se
          soumet automatiquement dès que la date change, pas besoin de
          bouton. */}
      <form method="GET" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          Nouvelle date
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
        <input type="hidden" name="id" value={bookingId} />
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
          {pending ? "Enregistrement..." : "Enregistrer le nouveau créneau"}
        </button>
      </form>
    </div>
  );
}
