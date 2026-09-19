"use client";

import { useState, useTransition } from "react";
import { updatePlatformPaymentSettings } from "./actions";

export type PlatformPaymentSettings = {
  mpesaNumber: string;
  mpesaHolderName: string;
  orangeMoneyNumber: string;
  orangeMoneyHolderName: string;
  contactName: string;
  contactWhatsapp: string;
};

/**
 * Numéros mobile money DE KINOBOOKING, utilisés dans le message WhatsApp
 * envoyé à un gérant fraîchement approuvé pour qu'il paie son abonnement
 * (voir ApproveSignupButton) — pas les numéros du gérant lui-même
 * (Configuration → Mobile money, pour recevoir SES clientes).
 */
export function PlatformPaymentSettingsForm({
  initial,
}: {
  initial: PlatformPaymentSettings;
}) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [pending, startTransition] = useTransition();

  const isDirty = (Object.keys(values) as (keyof PlatformPaymentSettings)[]).some(
    (key) => values[key] !== saved[key]
  );

  function set(key: keyof PlatformPaymentSettings, value: string) {
    setFeedback("idle");
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit() {
    const formData = new FormData();
    formData.set("mpesa_number", values.mpesaNumber);
    formData.set("mpesa_holder_name", values.mpesaHolderName);
    formData.set("orange_money_number", values.orangeMoneyNumber);
    formData.set("orange_money_holder_name", values.orangeMoneyHolderName);
    formData.set("contact_name", values.contactName);
    formData.set("contact_whatsapp", values.contactWhatsapp);

    startTransition(async () => {
      try {
        await updatePlatformPaymentSettings(formData);
        setSaved(values);
        setFeedback("success");
      } catch {
        setFeedback("error");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800">
      <p className="mb-3 text-xs text-ink-400">
        Utilisés dans le message WhatsApp envoyé à un gérant fraîchement
        approuvé, pour qu&apos;il sache où envoyer le paiement de son
        abonnement.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-900/10 p-3 dark:border-paper/10">
          <p className="mb-2 text-sm font-bold text-ink-900 dark:text-paper">
            M-Pesa
          </p>
          <div className="space-y-2">
            <input
              type="tel"
              value={values.mpesaNumber}
              onChange={(e) => set("mpesaNumber", e.target.value)}
              placeholder="Numéro (ex: 081 234 5678)"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
            <input
              type="text"
              value={values.mpesaHolderName}
              onChange={(e) => set("mpesaHolderName", e.target.value)}
              placeholder="Nom du titulaire"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
        </div>
        <div className="rounded-xl border border-ink-900/10 p-3 dark:border-paper/10">
          <p className="mb-2 text-sm font-bold text-ink-900 dark:text-paper">
            Orange Money
          </p>
          <div className="space-y-2">
            <input
              type="tel"
              value={values.orangeMoneyNumber}
              onChange={(e) => set("orangeMoneyNumber", e.target.value)}
              placeholder="Numéro (ex: 089 234 5678)"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
            <input
              type="text"
              value={values.orangeMoneyHolderName}
              onChange={(e) => set("orangeMoneyHolderName", e.target.value)}
              placeholder="Nom du titulaire"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
        </div>
        <div className="rounded-xl border border-ink-900/10 p-3 dark:border-paper/10 sm:col-span-2">
          <p className="mb-2 text-sm font-bold text-ink-900 dark:text-paper">
            Contact pour questions
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={values.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Nom (ex: Dino)"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
            <input
              type="tel"
              value={values.contactWhatsapp}
              onChange={(e) => set("contactWhatsapp", e.target.value)}
              placeholder="Numéro WhatsApp"
              className="w-full rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!isDirty || pending}
          onClick={submit}
          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
        {feedback === "success" && (
          <span className="text-xs font-bold text-success">
            Enregistré ✓
          </span>
        )}
        {feedback === "error" && (
          <span className="text-xs font-bold text-danger">
            Erreur lors de l&apos;enregistrement, merci de réessayer.
          </span>
        )}
      </div>
    </div>
  );
}
