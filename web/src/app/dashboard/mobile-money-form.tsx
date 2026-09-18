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
  { enabled: boolean; number: string; holderName: string }
>;

function toProviderValues(accounts: MobileMoneyAccount[]): ProviderValues {
  const base: ProviderValues = {
    mpesa: { enabled: false, number: "", holderName: "" },
    orange_money: { enabled: false, number: "", holderName: "" },
    airtel_money: { enabled: false, number: "", holderName: "" },
  };
  for (const account of accounts) {
    base[account.provider] = {
      enabled: true,
      number: account.number,
      holderName: account.holderName ?? "",
    };
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
      values[provider].number !== saved[provider].number ||
      values[provider].holderName !== saved[provider].holderName
  );

  // Un opérateur activé doit avoir son numéro ET son titulaire renseignés
  // (évite les litiges lors du transfert) — vérifié aussi côté serveur.
  function rowError(provider: MobileMoneyProvider): string | null {
    const v = values[provider];
    if (!v.enabled) return null;
    const missingNumber = !v.number.trim();
    const missingHolderName = !v.holderName.trim();
    if (missingNumber && missingHolderName) {
      return "Numéro et nom du titulaire requis";
    }
    if (missingNumber) return "Numéro requis";
    if (missingHolderName) return "Nom du titulaire requis";
    return null;
  }

  const hasRowErrors = (Object.keys(values) as MobileMoneyProvider[]).some(
    (provider) => rowError(provider) !== null
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm dark:border-paper/10 dark:bg-ink-800 sm:col-span-2"
    >
      <label className="font-bold text-ink-900 dark:text-paper">
        Mobile money
      </label>
      <p className="mt-1 mb-3 text-ink-400">
        Cochez chaque opérateur que vous utilisez. Le numéro et le nom du
        titulaire sont tous les deux obligatoires (affichés au client pour
        éviter tout litige au moment du transfert). Plusieurs opérateurs
        peuvent être actifs en même temps.
      </p>
      <div className="space-y-3">
        {(
          Object.entries(mobileMoneyProviderLabels) as [
            MobileMoneyProvider,
            string,
          ][]
        ).map(([provider, label]) => {
          const error = rowError(provider);
          const invalidClass = error
            ? "border-danger focus:border-danger"
            : "border-ink-900/16 dark:border-paper/16";

          return (
            <div
              key={provider}
              className="rounded-xl border border-ink-900/10 p-3 dark:border-paper/10"
            >
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-paper">
                <input
                  type="checkbox"
                  name={`${provider}_enabled`}
                  checked={values[provider].enabled}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [provider]: {
                        ...v[provider],
                        enabled: e.target.checked,
                      },
                    }))
                  }
                />
                {label}
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
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
                  placeholder="Numéro (ex: 081 234 5678)"
                  className={`w-full rounded-xl border p-3 text-sm dark:bg-ink-900 dark:text-paper ${invalidClass}`}
                />
                <input
                  type="text"
                  name={`${provider}_holder_name`}
                  value={values[provider].holderName}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [provider]: {
                        ...v[provider],
                        holderName: e.target.value,
                      },
                    }))
                  }
                  placeholder="Nom du titulaire (obligatoire)"
                  className={`w-full rounded-xl border p-3 text-sm dark:bg-ink-900 dark:text-paper ${invalidClass}`}
                />
              </div>
              {error && (
                <p className="mt-1 text-xs font-bold text-danger">{error}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={!isDirty || pending || hasRowErrors}
          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        {!isDirty && state.success && (
          <span className="text-xs font-bold text-success">
            Enregistrement réussi ✓
          </span>
        )}
        {state.error && (
          <span className="text-xs font-bold text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
