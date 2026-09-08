"use client";

import { useActionState, useState } from "react";
import { createBookingRequest, type BookingFormState } from "./actions";
import type { Slot } from "@/lib/availability";

type Service = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  duration_minutes: number;
  price_usd: number;
  deposit_usd: number;
};

const initialState: BookingFormState = {};

// Voir docs/functioneel-ontwerp-kinobooking.md, BR-1 : taux fixe pour le
// prototype/MVP, pas encore de mise à jour automatique (section 12.2).
const USD_TO_CDF_RATE = 2850;

function formatCdf(usd: number) {
  return `${Math.round(usd * USD_TO_CDF_RATE).toLocaleString("fr-FR")} FC`;
}

export function BookingForm({
  businessId,
  mainCategory,
  services,
  date,
  slots,
}: {
  businessId: string;
  mainCategory: string;
  services: Service[];
  date: string;
  slots: Slot[];
}) {
  const [state, formAction, pending] = useActionState(
    createBookingRequest,
    initialState
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const selectedService = services.find((s) => s.id === serviceId);
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

      {services.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Aucun service au catalogue pour l&apos;instant.
        </p>
      ) : (
        <form
          action={formAction}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <input type="hidden" name="business_id" value={businessId} />
          <input type="hidden" name="date" value={date} />

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              {mainCategory === "horeca" ? "Table ou espace" : "Prestation"}
            </label>
            <select
              name="service_id"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price_usd.toFixed(2)}
                </option>
              ))}
            </select>
            {selectedService?.description && (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {selectedService.description}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Créneau disponible le {date}
            </label>
            {slots.length === 0 && (
              <p className="text-sm text-slate-400">
                Aucun horaire configuré pour ce jour par cette zaak.
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

          {selectedService && (
            <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-3 text-xs text-white">
              <span className="text-slate-300">
                Acompte requis après validation :
              </span>
              <span className="font-extrabold text-kino-400">
                {formatCdf(selectedService.deposit_usd)} ($
                {selectedService.deposit_usd.toFixed(2)})
              </span>
            </div>
          )}

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
      )}
    </div>
  );
}
