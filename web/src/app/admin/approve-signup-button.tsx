"use client";

import { useState, useTransition } from "react";
import { conditionallyApproveBusiness } from "./actions";
import {
  buildWhatsAppLink,
  formatMobileMoneyAccounts,
  type MobileMoneyAccount,
} from "@/lib/whatsapp";
import { formatCdf } from "@/lib/currency";
import type { SubscriptionPlan } from "./subscription-plans-section";

type DurationMonths = 1 | 3 | 12;

const DURATION_LABELS: { value: DurationMonths; label: string }[] = [
  { value: 1, label: "1 mois" },
  { value: 3, label: "3 mois" },
  { value: 12, label: "1 an" },
];

/**
 * Approuve l'inscription "sous conditions" (étape 1/2, voir
 * conditionallyApproveBusiness/migration 0030) — mais seulement après que
 * l'admin a choisi les plans tarifaires auxquels ce salon a droit (au
 * moins un, voir migration 0042). Le message WhatsApp envoyé au gérant ne
 * liste que les plans sélectionnés, jamais tout le catalogue. PAS d'accès
 * au tableau de bord à ce stade : l'établissement reste bloqué tant que
 * le paiement n'est pas confirmé (AwaitingPaymentSection, étape 2/2).
 */
export function ApproveSignupButton({
  businessId,
  businessName,
  ownerName,
  ownerWhatsapp,
  plans,
  platformAccounts,
  contactName,
  contactWhatsapp,
}: {
  businessId: string;
  businessName: string;
  ownerName?: string | null;
  ownerWhatsapp?: string | null;
  plans: SubscriptionPlan[];
  platformAccounts: MobileMoneyAccount[];
  contactName?: string | null;
  contactWhatsapp?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  const selectedPlans = plans.filter((p) => selectedIds.includes(p.id));
  const paymentLine = formatMobileMoneyAccounts(platformAccounts, " ou ");

  function buildMessage(): string {
    const plansLines = selectedPlans
      .map((plan) => {
        const priceLines = DURATION_LABELS.map(
          (d) =>
            `  - ${d.label} : $${plan.prices[d.value].toFixed(2)} (${formatCdf(
              plan.prices[d.value]
            )})`
        ).join("\n");
        return `${plan.name} :\n${priceLines}`;
      })
      .join("\n");

    return `Bonjour ${
      ownerName ?? ""
    } ! Votre établissement "${businessName}" a été présélectionné sur KinoBooking. Pour activer votre accès au tableau de bord, merci de régler votre abonnement :
${plansLines}

${
  paymentLine
    ? `À envoyer via ${paymentLine}, puis confirmez-le-nous ici une fois fait — votre accès sera activé dès réception.`
    : "Contactez-nous pour connaître les modalités de paiement."
}${
      contactWhatsapp
        ? ` Des questions ? Contactez ${contactName ?? "nous"} au ${contactWhatsapp}.`
        : ""
    }`;
  }

  function confirm() {
    if (selectedIds.length === 0) return;

    if (ownerWhatsapp) {
      window.open(
        buildWhatsAppLink(ownerWhatsapp, buildMessage()),
        "_blank",
        "noopener,noreferrer"
      );
    }

    const formData = new FormData();
    formData.set("id", businessId);
    for (const id of selectedIds) formData.append("plan_ids", id);

    startTransition(async () => {
      await conditionallyApproveBusiness(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
      >
        Approuver sous conditions
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg dark:bg-ink-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 font-bold text-ink-900 dark:text-paper">
              Plans auxquels ce salon a droit
            </h3>
            <p className="mb-4 text-xs text-ink-400">{businessName}</p>

            <div className="mb-4 space-y-2">
              {plans.length === 0 && (
                <p className="text-xs text-ink-400">
                  Aucun plan actif — créez-en un dans « Plans tarifaires »
                  avant d&apos;approuver.
                </p>
              )}
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className="flex items-center gap-2 text-sm text-ink-900 dark:text-paper"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(plan.id)}
                    onChange={() => toggle(plan.id)}
                  />
                  {plan.name} — $
                  {DURATION_LABELS.map((d) => plan.prices[d.value].toFixed(0)).join(
                    " / $"
                  )}
                </label>
              ))}
            </div>

            {ownerWhatsapp && (
              <p className="mb-3 text-xs text-ink-400">
                Un message WhatsApp listant ces plans s&apos;ouvrira à la
                confirmation.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-xs font-bold text-ink-400 hover:underline"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0 || pending}
                onClick={confirm}
                className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Confirmation..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
