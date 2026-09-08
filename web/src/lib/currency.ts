// Voir docs/functioneel-ontwerp-kinobooking.md, BR-1 : taux fixe pour le
// prototype/MVP, pas encore de mise à jour automatique (section 12.2).
export const USD_TO_CDF_RATE = 2850;

export function formatCdf(usd: number) {
  return `${Math.round(usd * USD_TO_CDF_RATE).toLocaleString("fr-FR")} FC`;
}
