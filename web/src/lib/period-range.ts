/**
 * Découpage par période (heure de Kinshasa) pour les rapports
 * téléchargeables — admin (/admin/rapports, par mois) et gérant
 * (/dashboard/rapports, au choix par semaine/mois/trimestre/année).
 */

export type PeriodType = "week" | "month" | "quarter" | "year";

function toKinshasaDate(date: Date): Date {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Africa/Kinshasa" })
  );
}

function kinshasaNow(): Date {
  return toKinshasaDate(new Date());
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export type DateRange = { start: string; end: string };

// ============================================================
// Semaine — format natif de <input type="week"> : "YYYY-Www" (ISO 8601)
// ============================================================

function isoWeekMonday(year: number, week: number): Date {
  // La semaine ISO 1 est celle qui contient le premier jeudi de l'année.
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7; // lundi=1 ... dimanche=7
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
  return monday;
}

function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: d.getUTCFullYear(), week };
}

export function currentWeekIso(): string {
  const { year, week } = getIsoWeek(kinshasaNow());
  return `${year}-W${pad(week)}`;
}

export function weekRange(weekStr: string): DateRange {
  const [yearStr, weekPart] = weekStr.split("-W");
  const monday = isoWeekMonday(Number(yearStr), Number(weekPart));
  const start = `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}T00:00:00+01:00`;
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  const end = `${sunday.getUTCFullYear()}-${pad(sunday.getUTCMonth() + 1)}-${pad(sunday.getUTCDate())}T00:00:00+01:00`;
  return { start, end };
}

function getIsoWeekOfUtcDate(utcDate: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: d.getUTCFullYear(), week };
}

/** La semaine ISO juste avant `weekStr` — pour les comparaisons "vs semaine passée". */
export function previousWeekIso(weekStr: string): string {
  const [yearStr, weekPart] = weekStr.split("-W");
  const monday = isoWeekMonday(Number(yearStr), Number(weekPart));
  const prevMonday = new Date(monday);
  prevMonday.setUTCDate(monday.getUTCDate() - 7);
  const { year, week } = getIsoWeekOfUtcDate(prevMonday);
  return `${year}-W${pad(week)}`;
}

export function formatWeekLabel(weekStr: string): string {
  const { start, end } = weekRange(weekStr);
  const startDate = new Date(start);
  const endDate = new Date(new Date(end).getTime() - 1);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      timeZone: "Africa/Kinshasa",
      day: "2-digit",
      month: "short",
    });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

// ============================================================
// Mois — format natif de <input type="month"> : "YYYY-MM"
// ============================================================

export function currentMonthIso(): string {
  const now = kinshasaNow();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function monthRange(month: string): DateRange {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const start = `${yearStr}-${monthStr}-01T00:00:00+01:00`;
  const nextYear = monthNum === 12 ? year + 1 : year;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const end = `${nextYear}-${pad(nextMonth)}-01T00:00:00+01:00`;
  return { start, end };
}

export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// Trimestre — format "YYYY-Q1".."YYYY-Q4" (pas de <input> natif)
// ============================================================

export function currentQuarterIso(): string {
  const now = kinshasaNow();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

export function quarterRange(quarterStr: string): DateRange {
  const [yearStr, qStr] = quarterStr.split("-Q");
  const year = Number(yearStr);
  const q = Number(qStr);
  const startMonth = (q - 1) * 3 + 1;
  const start = `${yearStr}-${pad(startMonth)}-01T00:00:00+01:00`;
  const endMonthRaw = startMonth + 3;
  const endYear = endMonthRaw > 12 ? year + 1 : year;
  const endMonth = endMonthRaw > 12 ? endMonthRaw - 12 : endMonthRaw;
  const end = `${endYear}-${pad(endMonth)}-01T00:00:00+01:00`;
  return { start, end };
}

export function formatQuarterLabel(quarterStr: string): string {
  const [year, qStr] = quarterStr.split("-Q");
  return `T${qStr} ${year}`;
}

// ============================================================
// Année — format "YYYY" (pas de <input> natif, un simple <select>)
// ============================================================

export function currentYearIso(): string {
  return String(kinshasaNow().getFullYear());
}

export function yearRange(yearStr: string): DateRange {
  const year = Number(yearStr);
  return {
    start: `${yearStr}-01-01T00:00:00+01:00`,
    end: `${year + 1}-01-01T00:00:00+01:00`,
  };
}

export function formatYearLabel(yearStr: string): string {
  return yearStr;
}


// ============================================================
// Bornage des sélecteurs à la date d'inscription de l'établissement —
// inutile de proposer un trimestre ou une année d'avant sa création.
// ============================================================

export function monthIsoOfDate(date: Date): string {
  const d = toKinshasaDate(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function quarterIsoOfDate(date: Date): string {
  const d = toKinshasaDate(date);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function yearIsoOfDate(date: Date): string {
  return String(toKinshasaDate(date).getFullYear());
}

export function weekIsoOfDate(date: Date): string {
  const { year, week } = getIsoWeek(toKinshasaDate(date));
  return `${year}-W${pad(week)}`;
}

/** Trimestres du plus récent (actuel) jusqu'à `sinceQuarter` inclus. */
export function quartersSince(sinceQuarter: string): string[] {
  const [sinceYearStr, sinceQStr] = sinceQuarter.split("-Q");
  const sinceYear = Number(sinceYearStr);
  const sinceQ = Number(sinceQStr);

  const [yearStr, qStr] = currentQuarterIso().split("-Q");
  let year = Number(yearStr);
  let q = Number(qStr);

  const result: string[] = [];
  for (let i = 0; i < 400; i++) {
    result.push(`${year}-Q${q}`);
    if (year === sinceYear && q === sinceQ) break;
    if (year < sinceYear || (year === sinceYear && q < sinceQ)) break;
    q -= 1;
    if (q === 0) {
      q = 4;
      year -= 1;
    }
  }
  return result;
}

/** Années de l'actuelle jusqu'à `sinceYear` inclus. */
export function yearsSince(sinceYear: string): string[] {
  const since = Number(sinceYear);
  let year = Number(currentYearIso());

  const result: string[] = [];
  for (let i = 0; i < 200 && year >= since; i++) {
    result.push(String(year));
    year -= 1;
  }
  return result;
}
