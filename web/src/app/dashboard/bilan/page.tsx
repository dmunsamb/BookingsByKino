import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatCdf } from "@/lib/currency";
import {
  currentWeekIso,
  previousWeekIso,
  weekRange,
  formatWeekLabel,
} from "@/lib/period-range";

// Mêmes statuts que /dashboard/rapports : un rendez-vous annulé, no-show
// ou pas encore payé ne représente pas un encaissement réel.
const REVENUE_STATUSES = ["confirmed", "termine"];

type Entry = {
  id: string;
  service_id: string | null;
  status: string;
  source: string;
};

type ServiceInfo = { name: string; price_usd: number; deposit_usd: number };

function weekEntriesStats(
  entries: Entry[],
  serviceById: Map<string, ServiceInfo>
) {
  const revenueEntries = entries.filter(
    (e) => e.service_id && REVENUE_STATUSES.includes(e.status)
  );
  const totalUsd = revenueEntries.reduce(
    (sum, e) => sum + (serviceById.get(e.service_id!)?.price_usd ?? 0),
    0
  );

  const perService = new Map<string, { count: number; totalUsd: number }>();
  for (const e of revenueEntries) {
    const current = perService.get(e.service_id!) ?? { count: 0, totalUsd: 0 };
    current.count += 1;
    current.totalUsd += serviceById.get(e.service_id!)?.price_usd ?? 0;
    perService.set(e.service_id!, current);
  }
  const topServices = Array.from(perService.entries())
    .map(([serviceId, stats]) => ({
      serviceId,
      name: serviceById.get(serviceId)?.name ?? "Service inconnu",
      ...stats,
    }))
    .sort((a, b) => b.totalUsd - a.totalUsd)
    .slice(0, 3);

  // Toute entrée qui n'est pas un blocage de créneau est une vraie
  // tentative de réservation (rendez-vous, ticket sans RDV, manuelle) —
  // c'est le dénominateur pour le taux de no-show.
  const realBookings = entries.filter((e) => e.source !== "blokkering");
  const noShows = realBookings.filter((e) => e.status === "no_show");

  return { totalUsd, topServices, totalBookings: realBookings.length, noShows };
}

export default async function BilanPage() {
  const profile = await getCurrentProfile();

  if (!profile?.business_id || !canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Accès réservé au gérant de l&apos;établissement.
      </div>
    );
  }

  const week = currentWeekIso();
  const prevWeek = previousWeekIso(week);
  const { start, end } = weekRange(week);
  const { start: prevStart, end: prevEnd } = weekRange(prevWeek);

  const supabase = await createClient();

  const [{ data: currentEntries }, { data: previousEntries }, { data: services }] =
    await Promise.all([
      supabase
        .from("agenda_entries_for_dashboard")
        .select("id, service_id, status, source")
        .eq("business_id", profile.business_id)
        .gte("start_time", start)
        .lt("start_time", end),
      supabase
        .from("agenda_entries_for_dashboard")
        .select("id, service_id, status, source")
        .eq("business_id", profile.business_id)
        .gte("start_time", prevStart)
        .lt("start_time", prevEnd),
      supabase
        .from("services")
        .select("id, name, price_usd, deposit_usd")
        .eq("business_id", profile.business_id),
    ]);

  const serviceById = new Map(
    (services ?? []).map((s) => [s.id, s as ServiceInfo])
  );

  const current = weekEntriesStats((currentEntries ?? []) as Entry[], serviceById);
  const previous = weekEntriesStats(
    (previousEntries ?? []) as Entry[],
    serviceById
  );

  const deltaUsd = current.totalUsd - previous.totalUsd;
  const headline =
    deltaUsd > 0
      ? "La semaine a été meilleure"
      : deltaUsd < 0
        ? "La semaine a été moins bonne"
        : "La semaine a été stable";

  // Une seule recommandation, basée sur un signal réel plutôt que
  // générique : d'abord la cause la plus actionnable (absences sans
  // acompte), puis une tendance (plus d'absences que la semaine passée),
  // sinon un message positif s'il n'y a rien à signaler.
  let tip: string;
  if (current.noShows.length === 0) {
    tip = "Aucune absence cette semaine — continuez ainsi.";
  } else if (
    current.noShows.every(
      (e) => (serviceById.get(e.service_id ?? "")?.deposit_usd ?? 0) === 0
    )
  ) {
    const names = Array.from(
      new Set(
        current.noShows.map(
          (e) => serviceById.get(e.service_id ?? "")?.name ?? "ce service"
        )
      )
    );
    const plural = current.noShows.length > 1;
    tip = `${plural ? "Les absences concernaient" : "L'absence concernait"} des prestations sans acompte (${names.join(", ")}). Demandez un acompte, même symbolique, sur ${plural ? "ces prestations aussi" : "cette prestation aussi"}.`;
  } else if (current.noShows.length > previous.noShows.length) {
    tip = "Les absences augmentent par rapport à la semaine passée. Envoyez un rappel WhatsApp la veille du rendez-vous.";
  } else {
    tip = "Continuez à demander un acompte avant chaque rendez-vous : c'est ce qui limite le plus les absences.";
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <div className="mb-6 rounded-2xl bg-ink-900 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
          Ma semaine · {formatWeekLabel(week)}
        </p>
        <p className="mt-2 font-serif text-xl text-paper">{headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-paper/90">
          Vous avez encaissé{" "}
          <span className="font-bold text-kino-300">
            ${current.totalUsd.toFixed(2)} ({formatCdf(current.totalUsd)})
          </span>
          , soit{" "}
          <span className="font-bold text-kino-300">
            ${Math.abs(deltaUsd).toFixed(2)} ({formatCdf(Math.abs(deltaUsd))}) de{" "}
            {deltaUsd >= 0 ? "plus" : "moins"}
          </span>{" "}
          que la semaine passée.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-ink-900/10 bg-white p-5 dark:border-paper/10 dark:bg-ink-800">
        <p className="mb-3 text-sm font-bold text-ink-900 dark:text-paper">
          Ce qui se vend le plus
        </p>
        {current.topServices.length === 0 && (
          <p className="text-sm text-ink-400">
            Aucune vente enregistrée cette semaine.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {current.topServices.map((s, i) => {
            const maxUsd = current.topServices[0]?.totalUsd || 1;
            const widthPct = Math.round((s.totalUsd / maxUsd) * 100);
            return (
              <div key={s.serviceId} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-bold text-ink-900 dark:text-paper">
                    {s.name}
                  </span>
                  <span className="text-ink-400">
                    {s.count} fois · ${s.totalUsd.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-ink-900/8 dark:bg-paper/10">
                  <div
                    className={i === 0 ? "h-full bg-ink-900 dark:bg-paper" : "h-full bg-kino-400"}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-ink-900/10 bg-white p-5 dark:border-paper/10 dark:bg-ink-800">
        <p className="mb-2 text-sm font-bold text-ink-900 dark:text-paper">
          Clientes qui ne sont pas venues
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-danger">
            {current.noShows.length}
          </span>
          <span className="text-sm text-ink-400">
            sur {current.totalBookings} rendez-vous
            <br />
            (la semaine passée : {previous.noShows.length})
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-kino-200 bg-kino-50 p-5 dark:border-kino-800 dark:bg-ink-800">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-kino-700 dark:text-kino-300">
          Une chose à essayer
        </p>
        <p className="text-sm leading-relaxed text-ink-900 dark:text-paper">
          {tip}
        </p>
      </div>
    </div>
  );
}
