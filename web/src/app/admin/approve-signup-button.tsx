"use client";

import { approveBusiness } from "./actions";
import {
  buildWhatsAppLink,
  formatMobileMoneyAccounts,
  type MobileMoneyAccount,
} from "@/lib/whatsapp";
import { formatCdf } from "@/lib/currency";

type DurationMonths = 1 | 3 | 12;

const DURATION_LABELS: { value: DurationMonths; label: string }[] = [
  { value: 1, label: "1 mois" },
  { value: 3, label: "3 mois" },
  { value: 12, label: "1 an" },
];

/**
 * Approuve l'inscription et ouvre WhatsApp (même geste, comme
 * ValidateWithWhatsAppButton) avec un message listant les tarifs
 * d'abonnement et les numéros mobile money DE KINOBOOKING — l'accès est
 * donné tout de suite, "sous réserve" que le gérant régularise ensuite
 * (voir approveBusiness, migration 0029).
 */
export function ApproveSignupButton({
  businessId,
  businessName,
  ownerName,
  ownerWhatsapp,
  prices,
  platformAccounts,
  contactName,
  contactWhatsapp,
}: {
  businessId: string;
  businessName: string;
  ownerName?: string | null;
  ownerWhatsapp?: string | null;
  prices: Record<DurationMonths, number>;
  platformAccounts: MobileMoneyAccount[];
  contactName?: string | null;
  contactWhatsapp?: string | null;
}) {
  const paymentLine = formatMobileMoneyAccounts(platformAccounts, " ou ");
  const pricesLines = DURATION_LABELS.map(
    (d) =>
      `- ${d.label} : $${prices[d.value].toFixed(2)} (${formatCdf(
        prices[d.value]
      )})`
  ).join("\n");

  const message = `Bonjour ${
    ownerName ?? ""
  } ! Votre établissement "${businessName}" a été approuvé sur KinoBooking. Vous avez accès à votre tableau de bord : https://kinobooking.netlify.app/login (connectez-vous avec l'email utilisé à l'inscription).

Pour profiter d'un accès complet, il ne reste que le paiement de votre abonnement :
${pricesLines}

${
  paymentLine
    ? `À envoyer via ${paymentLine}, puis confirmez-le-nous ici une fois fait.`
    : "Contactez-nous pour connaître les modalités de paiement."
}${
    contactWhatsapp
      ? ` Des questions ? Contactez ${contactName ?? "nous"} au ${contactWhatsapp}.`
      : ""
  }`;

  const whatsAppLink = ownerWhatsapp ? buildWhatsAppLink(ownerWhatsapp, message) : null;

  return (
    <form
      action={approveBusiness}
      onSubmit={() => {
        if (whatsAppLink) {
          window.open(whatsAppLink, "_blank", "noopener,noreferrer");
        }
      }}
    >
      <input type="hidden" name="id" value={businessId} />
      <button
        type="submit"
        className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
      >
        {whatsAppLink ? "Approuver (WhatsApp)" : "Approuver"}
      </button>
    </form>
  );
}
