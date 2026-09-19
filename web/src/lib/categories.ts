/**
 * Catégories d'établissement — remplace l'ancien champ libre par une
 * liste fermée, utilisée à la fois pour le dropdown d'inscription et
 * pour le filtre de la page d'accueil. `mainCategory` détermine le
 * vocabulaire affiché ailleurs dans l'app ("Prestations" vs "Tables et
 * espaces" sur la fiche établissement) — voir etablissements/[id]/page.tsx.
 */
export type MainCategory = "beauty" | "horeca";

export const CATEGORIES: { value: string; mainCategory: MainCategory }[] = [
  { value: "Salon de coiffure", mainCategory: "beauty" },
  { value: "Salon de beauté", mainCategory: "beauty" },
  { value: "Barbershop (homme)", mainCategory: "beauty" },
  { value: "Spa", mainCategory: "beauty" },
  { value: "Autre", mainCategory: "beauty" },
];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

export function isValidCategory(value: string): boolean {
  return CATEGORY_VALUES.includes(value);
}

export function mainCategoryFor(value: string): MainCategory {
  return CATEGORIES.find((c) => c.value === value)?.mainCategory ?? "beauty";
}
