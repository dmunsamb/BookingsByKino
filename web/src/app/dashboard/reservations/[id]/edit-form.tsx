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
      <div className="rounded-2xl border border-kino-200 bg-kino-50 p-4 text-sm dark:border-kino-800 dark:bg-ink-800">
        <p className="font-bold text-ink-900 dark:text-paper">
          {clientName} — {serviceName}
        </p>
        <p className="text-xs text-ink-400">
          Seuls la date et l&apos;horaire peuvent être modifiés ici. Pour
          changer de prestation ou de client, annulez cette réservation et
          recréez-en une nouvelle.
        </p>
      </div>

      {/* Navigation GET pure : changer la date recharge la page avec les
          disponibilités du nouveau jour (même service, même durée). Se
          soumet automatiquement dès que la date change, pas besoin de
          bouton. */}
      <form method="GET" className="rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nouvelle date
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
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="date" value={date} />

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
            {slots.map((slot) => {
              const value = `${slot.time}|${slot.slotDurationMinutes}`;
              const isCurrent = value === currentSlotValue;
              return (
                <label
                  key={slot.time}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-bold has-[:checked]:border-kino-500 has-[:checked]:bg-kino-400 has-[:checked]:text-ink-900 ${
                    slot.available || isCurrent
                      ? "cursor-pointer border-ink-900/16 text-ink-900 dark:border-paper/16 dark:text-paper"
                      : "cursor-not-allowed border-ink-900/8 text-ink-400 line-through dark:border-paper/8"
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
          <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-kino-400 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer le nouveau créneau"}
        </button>
      </form>
    </div>
  );
}
