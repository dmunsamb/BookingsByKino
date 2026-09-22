import type { BusinessHour } from "@/lib/availability";

// Stockage : 0 = dimanche ... 6 = samedi (voir migration 0026). Affichage
// en ordre français classique (lundi -> dimanche).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

function formatRange(h: BusinessHour): string {
  return `${h.start_time.slice(0, 5)} - ${h.end_time.slice(0, 5)}`;
}

/** Heures d'ouverture du salon, sur la fiche établissement publique. */
export function OpeningHours({ hours }: { hours: BusinessHour[] }) {
  if (hours.length === 0) return null;

  const todayWeekday = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Kinshasa" })
  ).getDay();

  return (
    <div className="mb-6 rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
        Heures d&apos;ouverture
      </p>
      <dl className="space-y-1 text-sm">
        {DISPLAY_ORDER.map((weekday) => {
          const ranges = hours
            .filter((h) => h.weekday === weekday)
            .map(formatRange);
          const isToday = weekday === todayWeekday;
          return (
            <div
              key={weekday}
              className={`flex items-baseline justify-between ${
                isToday ? "font-bold text-ink-900 dark:text-paper" : "text-ink-400"
              }`}
            >
              <dt>{WEEKDAY_LABELS[weekday]}</dt>
              <dd>{ranges.length > 0 ? ranges.join(", ") : "Fermé"}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
