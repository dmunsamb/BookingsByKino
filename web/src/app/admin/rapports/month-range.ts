/**
 * Petits utilitaires de découpage par mois (heure de Kinshasa) pour les
 * rapports financiers — voir page.tsx et export/route.ts.
 */

export function currentMonthIso(): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Kinshasa" })
  );
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

/** Bornes [start, end) d'un mois "YYYY-MM", en heure de Kinshasa (UTC+1). */
export function monthRange(month: string): { start: string; end: string } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  const start = `${yearStr}-${monthStr}-01T00:00:00+01:00`;
  const nextYear = monthNum === 12 ? year + 1 : year;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const end = `${nextYear}-${nextMonth.toString().padStart(2, "0")}-01T00:00:00+01:00`;

  return { start, end };
}

export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}
