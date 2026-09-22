const COUNTRY_CODE = "243";

/**
 * Numéro congolais local à 10 chiffres ("0812345678") à partir de
 * n'importe quel format accepté — local (08.../09...) ou international
 * (+243..., 243..., avec ou sans espaces/tirets). Renvoie "" si le numéro
 * ne peut pas être reconnu comme un numéro RDC valide.
 */
export function normalizeCongoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith(COUNTRY_CODE)) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return digits;
  }
  return "";
}

/** Format E.164 ("+243812345678"), attendu par Supabase Auth (téléphone du personnel). */
export function toE164CongoPhone(phone: string): string | null {
  const local = normalizeCongoPhone(phone);
  return local ? `+${COUNTRY_CODE}${local.slice(1)}` : null;
}
