/**
 * Numéro de suivi court et lisible pour une réservation (toute source
 * confondue) — utile en cas de litige : le client peut en faire une
 * capture d'écran, le gérant et KinoBooking partagent le même
 * identifiant (voir supabase/migrations/0012).
 */
export function formatBookingReference(referenceNumber: number): string {
  return `KB-${referenceNumber.toString().padStart(6, "0")}`;
}

/** Accepte "KB-000123", "000123" ou "123" — ne garde que les chiffres. */
export function parseBookingReference(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}
