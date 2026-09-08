/**
 * Lien wa.me avec message prérempli — PAS une intégration API WhatsApp.
 * Le gérant clique, WhatsApp s'ouvre avec le message déjà écrit, et c'est
 * lui qui appuie sur "Envoyer". Rien n'est envoyé automatiquement par le
 * système (phase 1, voir docs section 12.2 : notifications automatiques
 * reportées à plus tard).
 */

export type MobileMoneyProvider = "mpesa" | "orange_money" | "airtel_money";

export const mobileMoneyProviderLabels: Record<MobileMoneyProvider, string> = {
  mpesa: "M-Pesa",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
};

export type MobileMoneyAccount = {
  provider: MobileMoneyProvider;
  number: string;
  holderName: string | null;
};

/**
 * Plusieurs comptes mobile money peuvent être actifs en même temps (ex.
 * M-Pesa ET Orange Money). Le nom du titulaire est inclus entre
 * parenthèses quand renseigné, pour que le client puisse vérifier à qui
 * il envoie son argent avant de payer (évite les litiges).
 */
export function formatMobileMoneyAccounts(
  accounts: MobileMoneyAccount[],
  separator = " · "
): string | null {
  if (accounts.length === 0) return null;
  return accounts
    .map((a) => {
      const base = `${mobileMoneyProviderLabels[a.provider]} ${a.number}`;
      return a.holderName ? `${base} (${a.holderName})` : base;
    })
    .join(separator);
}

/** Normalise un numéro local RDC ("081 000 0000") vers le format international attendu par wa.me. */
function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("243")) return digits;
  if (digits.startsWith("0")) return `243${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`;
}
