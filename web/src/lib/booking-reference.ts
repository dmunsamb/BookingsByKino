/**
 * Numéro de suivi court et lisible pour une réservation (toute source
 * confondue) — utile en cas de litige : le client peut en faire une
 * capture d'écran, le gérant et KinoBooking partagent le même
 * identifiant (voir supabase/migrations/0012).
 */
export function formatBookingReference(referenceNumber: number): string {
  return `KB-${referenceNumber.toString().padStart(6, "0")}`;
}
