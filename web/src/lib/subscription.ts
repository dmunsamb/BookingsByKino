/**
 * Statut d'abonnement d'un établissement, calculé à la volée à partir de
 * subscription_paid_until — pas de valeur stockée à faire évoluer via une
 * tâche planifiée (aucun cron dans ce projet).
 *
 * - actif : payé jusqu'à une date future.
 * - en_attente : échu depuis moins de 7 jours (délai de grâce).
 * - inactif : échu depuis plus de 7 jours — coupe l'accès au dashboard
 *   du gérant/personnel (jamais à platform_admin), voir dashboard/page.tsx.
 *
 * paidUntil = null (jamais facturé, ex. juste après approbation) est
 * traité comme "actif" par défaut : on ne pénalise pas un établissement
 * avant même sa première échéance.
 */

export type SubscriptionStatus = "actif" | "en_attente" | "inactif";

const GRACE_PERIOD_DAYS = 7;

export function getSubscriptionStatus(
  paidUntil: string | null
): SubscriptionStatus {
  if (!paidUntil) return "actif";

  const now = Date.now();
  const paidUntilMs = new Date(paidUntil).getTime();

  if (now <= paidUntilMs) return "actif";

  const graceEndMs = paidUntilMs + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return now <= graceEndMs ? "en_attente" : "inactif";
}

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  actif: "Actif",
  en_attente: "En attente de paiement",
  inactif: "Inactif",
};
