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

/**
 * Normalise un numéro vers le format attendu par wa.me (chiffres
 * uniquement, sans "+" ni "00" en tête) — accepte n'importe quel pays.
 *
 * - Préfixe international fourni ("+33..." ou "0033...") : on retire
 *   uniquement ce préfixe, le reste du numéro n'est pas modifié.
 * - Aucun préfixe fourni (ex: "081 000 0000") : on ne touche à rien,
 *   notamment on n'ajoute plus l'indicatif 243 automatiquement — ce sont
 *   normalement des numéros congolais, WhatsApp applique alors
 *   l'indicatif RDC par défaut.
 */
function toWhatsAppDigits(phone: string): string {
  const hasPlusPrefix = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (hasPlusPrefix) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`;
}
