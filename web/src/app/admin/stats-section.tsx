import { createClient } from "@/lib/supabase/server";

/**
 * Stats "Croissance" et "Usage réel" (les deux catégories choisies pour
 * la v1, voir discussion produit — Revenus/Rétention/Catalogue restent
 * pour une itération suivante). Mêmes chiffres que le rapport mensuel
 * envoyé par email (netlify/functions/monthly-report.mts), mais calculés
 * ici à la demande plutôt que par la fonction planifiée — code non
 * partagé entre les deux (runtimes différents, voir le commentaire en
 * tête de ce fichier de fonction).
 *
 * `createClient()` (session platform_admin), pas le client admin : RLS
 * déjà permissive pour ce rôle (is_staff_of/is_owner_of traitent
 * platform_admin comme universel, voir migrations 0002/0041).
 */

const MONTHS_SHOWN = 6;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}

function bucketByMonth(dates: string[], monthsBack: number): { label: string; count: number }[] {
  const now = new Date();
  const buckets = new Map<string, number>();
  const labels = new Map<string, string>();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = monthKey(d);
    buckets.set(key, 0);
    labels.set(key, monthLabel(d));
  }

  for (const iso of dates) {
    const key = monthKey(new Date(iso));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([key, count]) => ({
    label: labels.get(key) ?? key,
    count,
  }));
}

function MiniBarChart({
  data,
  title,
}: {
  data: { label: string; count: number }[];
  title: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">
        {title}
      </p>
      <div className="flex items-end gap-2" style={{ height: "80px" }}>
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-kino-400"
              style={{ height: `${Math.max(4, (d.count / max) * 64)}px` }}
              title={`${d.label} : ${d.count}`}
            />
            <span className="text-[10px] font-bold text-ink-900 dark:text-paper">
              {d.count}
            </span>
            <span className="text-[10px] text-ink-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-900/10 p-3 dark:border-paper/10">
      <p className="font-serif text-2xl text-ink-900 dark:text-paper">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}

export async function StatsSection() {
  const supabase = await createClient();

  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_SHOWN - 1), 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    { data: newBusinesses },
    { data: bookings },
    { data: bookingStatusesThisMonth },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("created_at")
      .gte("created_at", windowStart.toISOString()),
    supabase
      .from("agenda_entries")
      .select("created_at")
      .eq("source", "klant_app")
      .gte("created_at", windowStart.toISOString()),
    supabase
      .from("agenda_entries")
      .select("status")
      .eq("source", "klant_app")
      .gte("created_at", monthStart.toISOString()),
  ]);

  const signupsByMonth = bucketByMonth(
    (newBusinesses ?? []).map((b) => b.created_at),
    MONTHS_SHOWN
  );
  const bookingsByMonth = bucketByMonth(
    (bookings ?? []).map((b) => b.created_at),
    MONTHS_SHOWN
  );

  const signupsThisMonth = signupsByMonth[signupsByMonth.length - 1]?.count ?? 0;
  const bookingsThisMonth = bookingsByMonth[bookingsByMonth.length - 1]?.count ?? 0;

  let confirmed = 0;
  let rejected = 0;
  let noShow = 0;
  for (const b of bookingStatusesThisMonth ?? []) {
    if (b.status === "confirmed" || b.status === "termine") confirmed++;
    else if (b.status === "geannuleerd") rejected++;
    else if (b.status === "no_show") noShow++;
  }
  const decided = confirmed + rejected;
  const validationRate = decided > 0 ? `${Math.round((confirmed / decided) * 100)}%` : "—";
  const noShowRate =
    confirmed + noShow > 0 ? `${Math.round((noShow / (confirmed + noShow)) * 100)}%` : "—";

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Statistiques
      </h2>

      <div className="mb-4 grid gap-4 rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-bold text-ink-900 dark:text-paper">
            Croissance
          </p>
          <div className="mb-4 grid grid-cols-1 gap-2">
            <StatTile label="Nouvelles inscriptions ce mois" value={String(signupsThisMonth)} />
          </div>
          <MiniBarChart data={signupsByMonth} title="Inscriptions / mois" />
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-ink-900 dark:text-paper">
            Usage réel
          </p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatTile label="Réservations ce mois" value={String(bookingsThisMonth)} />
            <StatTile label="Taux de validation" value={validationRate} />
            <StatTile label="Taux de no-show" value={noShowRate} />
          </div>
          <MiniBarChart data={bookingsByMonth} title="Réservations / mois" />
        </div>
      </div>
    </section>
  );
}
