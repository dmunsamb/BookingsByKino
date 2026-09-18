/**
 * Villes couvertes par KinoBooking, chacune avec ses propres communes —
 * proposées en dropdown à l'inscription plutôt qu'en champ libre, pour
 * un filtre fiable plus tard (pas de doublons "Ngaliema"/"ngaliema").
 * Pour l'instant une seule ville (Kinshasa) ; en ajouter une autre ne
 * demande qu'une nouvelle entrée ici, le formulaire s'adapte tout seul.
 */
const KINSHASA_COMMUNES = [
  "Bandalungwa",
  "Barumbu",
  "Bumbu",
  "Gombe",
  "Kalamu",
  "Kasa-Vubu",
  "Kimbanseke",
  "Kinshasa",
  "Kintambo",
  "Kisenso",
  "Lemba",
  "Limete",
  "Lingwala",
  "Makala",
  "Maluku",
  "Masina",
  "Matete",
  "Mont-Ngafula",
  "Ndjili",
  "Ngaba",
  "Ngaliema",
  "Ngiri-Ngiri",
  "N'sele",
  "Selembao",
] as const;

export const COMMUNES_BY_CITY: Record<string, readonly string[]> = {
  Kinshasa: KINSHASA_COMMUNES,
};

export const CITIES = Object.keys(COMMUNES_BY_CITY);

export function communesForCity(city: string): readonly string[] {
  return COMMUNES_BY_CITY[city] ?? [];
}
