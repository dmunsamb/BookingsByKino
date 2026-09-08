"use client";

import { useState, useTransition } from "react";
import { updateSubscriptionPrices } from "./actions";

const DURATION_MONTHS = [1, 3, 12] as const;
type DurationMonths = (typeof DURATION_MONTHS)[number];

/**
 * Formulaire des tarifs d'abonnement. Le bouton reste désactivé tant
 * qu'aucun champ n'a été modifié par rapport aux valeurs enregistrées
 * (évite les clics "à vide" sans retour), et affiche un message de
 * confirmation/erreur après l'enregistrement — sinon rien n'indique si
 * le clic a fonctionné.
 */
export function SubscriptionPricesForm({
  initialPrices,
}: {
  initialPrices: Record<DurationMonths, number>;
}) {
  const [saved, setSaved] = useState(initialPrices);
  const [values, setValues] = useState(initialPrices);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [pending, startTransition] = useTransition();

  const isDirty = DURATION_MONTHS.some(
    (m) => String(values[m]) !== String(saved[m])
  );

  function handleChange(months: DurationMonths, raw: string) {
    setFeedback("idle");
    setValues((v) => ({ ...v, [months]: raw === "" ? 0 : Number(raw) }));
  }

  function submit() {
    const formData = new FormData();
    for (const m of DURATION_MONTHS) {
      formData.set(`price_${m}`, String(values[m]));
    }

    startTransition(async () => {
      try {
        await updateSubscriptionPrices(formData);
        setSaved(values);
        setFeedback("success");
      } catch {
        setFeedback("error");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        {DURATION_MONTHS.map((m) => (
          <div key={m} className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              {m === 12 ? "1 an" : `${m} mois`} ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values[m]}
              onChange={(e) => handleChange(m, e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        ))}
        <button
          type="button"
          disabled={!isDirty || pending}
          onClick={submit}
          className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Enregistrement..." : "Enregistrer les tarifs"}
        </button>
      </div>
      <div className="mt-2 h-4 text-xs font-bold">
        {feedback === "success" && (
          <span className="text-emerald-600 dark:text-emerald-400">
            Tarifs enregistrés ✓
          </span>
        )}
        {feedback === "error" && (
          <span className="text-red-600 dark:text-red-400">
            Erreur lors de l&apos;enregistrement, merci de réessayer.
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">
        Ces montants apparaissent en présélection lors de
        l&apos;enregistrement d&apos;un paiement gérant, avec toujours la
        possibilité de saisir un autre montant.
      </p>
    </div>
  );
}
