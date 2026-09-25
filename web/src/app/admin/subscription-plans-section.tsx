"use client";

import { useState, useTransition } from "react";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  updateSubscriptionPlan,
} from "./actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

const DURATION_MONTHS = [1, 3, 12] as const;
type DurationMonths = (typeof DURATION_MONTHS)[number];

export type SubscriptionPlan = {
  id: string;
  name: string;
  active: boolean;
  prices: Record<DurationMonths, number>;
};

function durationLabel(months: DurationMonths): string {
  return months === 12 ? "1 an" : `${months} mois`;
}

/**
 * Plusieurs plans tarifaires (au lieu d'un tarif unique) : chaque salon
 * n'a droit qu'aux plans choisis pour lui par l'admin à l'approbation
 * "sous conditions" (voir ApproveSignupButton) — permet par exemple un
 * tarif "Standard" et un tarif négocié pour certains établissements.
 */
export function SubscriptionPlansSection({
  plans,
}: {
  plans: SubscriptionPlan[];
}) {
  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <PlanEditor key={plan.id} plan={plan} />
      ))}
      <NewPlanForm />
    </div>
  );
}

function PlanEditor({ plan }: { plan: SubscriptionPlan }) {
  const [name, setName] = useState(plan.name);
  const [active, setActive] = useState(plan.active);
  const [prices, setPrices] = useState(plan.prices);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [pending, startTransition] = useTransition();

  const isDirty =
    name !== plan.name ||
    active !== plan.active ||
    DURATION_MONTHS.some((m) => String(prices[m]) !== String(plan.prices[m]));

  function submit() {
    const formData = new FormData();
    formData.set("id", plan.id);
    formData.set("name", name);
    formData.set("active", active.toString());
    for (const m of DURATION_MONTHS) {
      formData.set(`price_${m}`, String(prices[m]));
    }
    startTransition(async () => {
      try {
        await updateSubscriptionPlan(formData);
        setFeedback("success");
      } catch {
        setFeedback("error");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Nom du plan
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setFeedback("idle");
              setName(e.target.value);
            }}
            className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
        {DURATION_MONTHS.map((m) => (
          <div key={m} className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              {durationLabel(m)} ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prices[m]}
              onChange={(e) => {
                setFeedback("idle");
                setPrices((p) => ({
                  ...p,
                  [m]: e.target.value === "" ? 0 : Number(e.target.value),
                }));
              }}
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
        ))}
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-ink-900 dark:text-paper">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setFeedback("idle");
              setActive(e.target.checked);
            }}
          />
          Actif
        </label>
        <button
          type="button"
          disabled={!isDirty || pending}
          onClick={submit}
          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <form action={deleteSubscriptionPlan}>
          <input type="hidden" name="id" value={plan.id} />
          <ConfirmDeleteButton />
        </form>
      </div>
      <div className="mt-2 h-4 text-xs font-bold">
        {feedback === "success" && (
          <span className="text-success">Plan enregistré ✓</span>
        )}
        {feedback === "error" && (
          <span className="text-danger">
            Erreur lors de l&apos;enregistrement, merci de réessayer.
          </span>
        )}
      </div>
      {!active && (
        <p className="text-xs text-ink-400">
          Désactivé : ne sera plus proposé à un nouveau salon, mais reste
          valable pour les établissements qui y ont déjà droit.
        </p>
      )}
    </div>
  );
}

function NewPlanForm() {
  const [name, setName] = useState("");
  const [prices, setPrices] = useState<Record<DurationMonths, string>>({
    1: "",
    3: "",
    12: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) {
      setError("Nom requis.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    for (const m of DURATION_MONTHS) {
      formData.set(`price_${m}`, prices[m] || "0");
    }
    startTransition(async () => {
      try {
        await createSubscriptionPlan(formData);
        setName("");
        setPrices({ 1: "", 3: "", 12: "" });
      } catch {
        setError("Erreur lors de la création du plan.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-ink-900/16 bg-kino-50/60 p-4 dark:border-paper/16 dark:bg-ink-900/60">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Nouveau plan
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Nom du plan
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex : Premium"
            className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
        {DURATION_MONTHS.map((m) => (
          <div key={m} className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              {durationLabel(m)} ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prices[m]}
              onChange={(e) =>
                setPrices((p) => ({ ...p, [m]: e.target.value }))
              }
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:opacity-60"
        >
          {pending ? "Création..." : "Créer le plan"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-bold text-danger">{error}</p>}
    </div>
  );
}
