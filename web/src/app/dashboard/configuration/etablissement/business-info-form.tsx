"use client";

import { useActionState } from "react";
import { updateBusinessInfo, type BusinessInfoFormState } from "./actions";
import { CategoryCheckboxes } from "@/components/category-checkboxes";
import { CityCommuneFields } from "@/components/city-commune-fields";

const initialState: BusinessInfoFormState = {};

export function BusinessInfoForm({
  name,
  categories,
  address,
  commune,
  city,
  whatsapp,
}: {
  name: string;
  categories: string[];
  address: string;
  commune: string;
  city: string;
  whatsapp: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessInfo,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-ink-900/10 bg-white p-6 dark:border-paper/10 dark:bg-ink-800"
    >
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Nom de l&apos;établissement
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={name}
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <CategoryCheckboxes defaultValues={categories} />

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Adresse
        </label>
        <input
          name="address"
          type="text"
          defaultValue={address}
          placeholder="ex: Avenue Kasa-Vubu 123"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
      </div>

      <CityCommuneFields defaultCity={city} defaultCommune={commune} />

      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
          Numéro WhatsApp
        </label>
        <input
          name="whatsapp"
          type="tel"
          defaultValue={whatsapp}
          placeholder="ex: 081 000 0000"
          className="w-full rounded-xl border border-ink-900/16 bg-white p-3 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
        />
        <p className="mt-1 text-xs text-ink-400">
          Utilisé par KinoBooking pour vous contacter (rappels
          d&apos;abonnement, support).
        </p>
      </div>

      {state.error && (
        <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl bg-success/10 p-3 text-xs text-success">
          Enregistré.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-kino-400 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
