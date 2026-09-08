"use client";

import { useState, useTransition } from "react";
import { approveBusiness, recordSubscriptionPayment } from "./actions";

type DurationMonths = 1 | 3 | 12;

const DURATION_OPTIONS: { value: DurationMonths; label: string }[] = [
  { value: 1, label: "1 mois" },
  { value: 3, label: "3 mois" },
  { value: 12, label: "1 an" },
];

/**
 * Popup d'enregistrement d'un paiement gérant : on choisit d'abord la
 * durée payée, ce qui affiche le tarif déjà configuré pour cette durée
 * (voir section "Tarifs d'abonnement") en présélection — avec une option
 * "Autre montant" si le gérant a payé un montant différent (négocié,
 * partiel, etc.).
 */
export function SubscriptionPaymentDialog({
  businessId,
  businessName,
  prices,
  mode,
  triggerLabel,
}: {
  businessId: string;
  businessName: string;
  prices: Record<DurationMonths, number>;
  mode: "approve" | "renew";
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState<DurationMonths>(1);
  const [choice, setChoice] = useState<"preset" | "other">("preset");
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const presetAmount = prices[months];

  function close() {
    setOpen(false);
    setError(null);
    setChoice("preset");
    setCustomAmount("");
  }

  function submit() {
    const amount = choice === "preset" ? presetAmount : Number(customAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Montant invalide.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("id", businessId);
    formData.set("months", String(months));
    formData.set("amount_usd", String(amount));

    startTransition(async () => {
      if (mode === "approve") {
        await approveBusiness(formData);
      } else {
        await recordSubscriptionPayment(formData);
      }
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
              Paiement reçu
            </h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {businessName}
            </p>

            <p className="mb-1 text-xs font-bold uppercase text-slate-500">
              Durée payée
            </p>
            <div className="mb-4 flex gap-3 text-sm text-slate-700 dark:text-slate-300">
              {DURATION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={months === opt.value}
                    onChange={() => {
                      setMonths(opt.value);
                      setChoice("preset");
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <p className="mb-1 text-xs font-bold uppercase text-slate-500">
              Montant payé
            </p>
            <div className="mb-1 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={choice === "preset"}
                  onChange={() => setChoice("preset")}
                />
                ${presetAmount.toFixed(2)} (tarif configuré — {DURATION_OPTIONS.find((o) => o.value === months)?.label})
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={choice === "other"}
                  onChange={() => setChoice("other")}
                />
                Autre montant
              </label>
              {choice === "other" && (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Montant en $"
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs font-bold text-red-600">{error}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:underline"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600 disabled:opacity-60"
              >
                {pending ? "Enregistrement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
