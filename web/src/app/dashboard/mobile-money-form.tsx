"use client";

import { useActionState, useState } from "react";
import {
  updateMobileMoneyInfo,
  type MobileMoneyFormState,
} from "./actions";
import {
  mobileMoneyProviderLabels,
  type MobileMoneyAccount,
  type MobileMoneyProvider,
} from "@/lib/whatsapp";

const initialState: MobileMoneyFormState = {};

type ProviderValues = Record<
  MobileMoneyProvider,
  { enabled: boolean; number: string }
>;

function toProviderValues(accounts: MobileMoneyAccount[]): ProviderValues {
  const base: ProviderValues = {
    mpesa: { enabled: false, number: "" },
    orange_money: { enabled: false, number: "" },
    airtel_money: { enabled: false, number: "" },
  };
  for (const account of accounts) {
    base[account.provider] = { enabled: true, number: account.number };
  }
  return base;
}

export function MobileMoneyForm({
  accounts,
}: {
  accounts: MobileMoneyAccount[];
}) {
  // Recalculé à chaque rendu à partir des données serveur : après un
  // enregistrement réussi, le serveur renvoie exactement ce que
  // l'utilisateur vient de saisir, donc `saved` rattrape `values` et le
  // bouton se redésactive tout seul, sans logique de reset explicite.
  const saved = toProviderValues(accounts);
  const [values, setValues] = useState(saved);
  const [state, formAction, pending] = useActionState(
    updateMobileMoneyInfo,
    initialState
  );

  const isDirty = (Object.keys(values) as MobileMoneyProvider[]).some(
    (provider) =>
      values[provider].enabled !== saved[provider].enabled ||
      values[provider].number !== saved[provider].number
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-2"
    >
      <label className="font-bold text-slate-900 dark:text-white">
        Mobile money
      </label>
      <p className="mt-1 mb-3 text-slate-500 dark:text-slate-400">
        Cochez chaque opérateur que vous utilisez et renseignez son numéro.
        Plusieurs peuvent être actifs en même temps — tous seront indiqués au
        client.
      </p>
      <div className="space-y-3">
        {(
          Object.entries(mobileMoneyProviderLabels) as [
            MobileMoneyProvider,
            string,
          ][]
        ).map(([provider, label]) => (
          <div key={provider} className="flex items-center gap-2">
            <label className="flex w-40 shrink-0 items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                name={`${provider}_enabled`}
                checked={values[provider].enabled}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [provider]: { ...v[provider], enabled: e.target.checked },
                  }))
                }
              />
              {label}
            </label>
            <input
              type="tel"
              name={`${provider}_number`}
              value={values[provider].number}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [provider]: { ...v[provider], number: e.target.value },
                }))
              }
              placeholder="081 000 0000"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={!isDirty || pending}
          className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        {!isDirty && state.success && (
          <span className="text-xs font-bold text-emerald-600">
            Enregistrement réussi ✓
          </span>
        )}
        {state.error && (
          <span className="text-xs font-bold text-red-600">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
