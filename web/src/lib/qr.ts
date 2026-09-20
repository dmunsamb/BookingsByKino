/**
 * QR code affiché/imprimé dans le salon pour la file d'attente sans
 * rendez-vous (US-C4 étendu). Sécurité pragmatique, pas cryptographique
 * (voir discussion produit) : le QR encode simplement l'URL du module,
 * avec un paramètre qui signale "arrivée par scan direct" (caméra native
 * du téléphone). Le scanner intégré à la page (qr-scanner.tsx) vérifie
 * juste que le contenu scanné correspond bien à CE salon avant de
 * débloquer le formulaire — pas de jeton signé, le vrai garde-fou reste
 * opérationnel (un ticket non honoré sur place est simplement marqué
 * "No-show"/"Parti" par le personnel).
 */

export const QUEUE_QR_PARAM = "entree";
export const QUEUE_QR_VALUE = "qr";

export function queueJoinPath(businessId: string): string {
  return `/etablissements/${businessId}/file-attente`;
}

export function buildQueueJoinUrl(origin: string, businessId: string): string {
  return `${origin}${queueJoinPath(businessId)}?${QUEUE_QR_PARAM}=${QUEUE_QR_VALUE}`;
}
