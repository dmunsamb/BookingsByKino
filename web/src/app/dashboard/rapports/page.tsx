import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatCdf } from "@/lib/currency";
import { formatBookingReference } from "@/lib/booking-reference";
import { DashboardNav } from "../dashboard-nav";
import {
  type PeriodType,
  currentWeekIso,
  previousWeekIso,
  weekRange,
  formatWeekLabel,
  weekIsoOfDate,
  currentMonthIso,
  monthRange,
  formatMonthLabel,
  monthIsoOfDate,
  currentQuarterIso,
  quarterRange,
  formatQuarterLabel,
  quarterIsoOfDate,
  quartersSince,
  currentYearIso,
  yearRange,
  formatYearLabel,
  yearIsoOfDate,
  yearsSince,
} from "@/lib/period-range";

const PERIOD_TABS: { type: PeriodType; label: string }[] = [
  { type: "week", label: "Semaine" },
  { type: "month", label: "Mois" },
  { type: "quarter", label: "Trimestre" },
  { type: "year", label: "Année" },
];

// Statuts comptés comme du chiffre d'affaires réalisé — un rendez-vous
// annulé, no-show ou pas encore payé ne doit pas gonfler le total.
const REVENUE_STATUSES = ["confirmed", "termine"];

const statusLabels: Record<string, string> = {
  pending_approval: "Demande en attente",
  approved_waiting_payment: "En attente de paiement",
  confirmed: "Confirmée",
  termine: "Terminée",
  no_show: "No-show",
  geannuleerd: "Annulée",
};

type WeekEntry = {
  id: string;
  service_id: string | null;
  status: string;
  source: string;
};

type WeekServiceInfo = { name: string; price_usd: number; deposit_usd: number };

function weekEntriesStats(
  entries: WeekEntry[],
  serviceById: Map<string, WeekServiceInfo>
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

function periodValue(
  type: PeriodType,
  params: Record<string, string | undefined>
): string {
  switch (type) {
    case "week":
      return params.week || currentWeekIso();
    case "month":
      return params.month || currentMonthIso();
    case "quarter":
      return params.quarter || currentQuarterIso();
    case "year":
      return params.year || currentYearIso();
  }
}

function periodRange(type: PeriodType, value: string) {
  switch (type) {
    case "week":
      return weekRange(value);
    case "month":
      return monthRange(value);
    case "quarter":
      return quarterRange(value);
    case "year":
      return yearRange(value);
  }
}

function periodLabel(type: PeriodType, value: string) {
  switch (type) {
    case "week":
      return formatWeekLabel(value);
    case "month":
      return formatMonthLabel(value);
    case "quarter":
      return formatQuarterLabel(value);
    case "year":
      return formatYearLabel(value);
  }
}

export default async function GerantRapportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    week?: string;
    month?: string;
    quarter?: string;
    year?: string;
    staff?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile?.business_id || !canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Accès réservé au gérant de l&apos;établissement.
      </div>
    );
  }

  const params = await searchParams;
  const type: PeriodType =
    params.type === "week" ||
    params.type === "month" ||
    params.type === "quarter" ||
    params.type === "year"
      ? params.type
      : "month";
  const value = periodValue(type, params);
  const { start, end } = periodRange(type, value);
  const staffFilter = params.staff || null;

  const supabase = await createClient();

  const week = currentWeekIso();
  const prevWeek = previousWeekIso(week);
  const { start: weekStart, end: weekEnd } = weekRange(week);
  const { start: prevWeekStart, end: prevWeekEnd } = weekRange(prevWeek);

  let entriesQuery = supabase
    .from("agenda_entries_for_dashboard")
    .select(
      "id, service_id, client_name, client_phone_display, start_time, status, reference_number, staff_name"
    )
    .eq("business_id", profile.business_id)
    .gte("start_time", start)
    .lt("start_time", end)
    .order("start_time");
  if (staffFilter) {
    entriesQuery = entriesQuery.eq("staff_id", staffFilter);
  }

  const [
    { data: entries },
    { data: currentWeekEntries },
    { data: previousWeekEntries },
    { data: weekServices },
    { data: businessRow },
    { data: staffMembers },
  ] = await Promise.all([
    entriesQuery,
    supabase
      .from("agenda_entries_for_dashboard")
      .select("id, service_id, status, source")
      .eq("business_id", profile.business_id)
      .gte("start_time", weekStart)
      .lt("start_time", weekEnd),
    supabase
      .from("agenda_entries_for_dashboard")
      .select("id, service_id, status, source")
      .eq("business_id", profile.business_id)
      .gte("start_time", prevWeekStart)
      .lt("start_time", prevWeekEnd),
    supabase
      .from("services")
      .select("id, name, price_usd, deposit_usd")
      .eq("business_id", profile.business_id),
    supabase
      .from("businesses")
      .select("created_at")
      .eq("id", profile.business_id)
      .maybeSingle(),
    supabase
      .from("staff_members")
      .select("id, name")
      .eq("business_id", profile.business_id)
      .order("name"),
  ]);

  // Aucune période antérieure à l'inscription de l'établissement : ça
  // n'aurait aucune donnée, autant ne pas la proposer dans les sélecteurs.
  const registrationDate = businessRow?.created_at
    ? new Date(businessRow.created_at)
    : new Date();
  const registrationWeek = weekIsoOfDate(registrationDate);
  const registrationMonth = monthIsoOfDate(registrationDate);
  const registrationQuarter = quarterIsoOfDate(registrationDate);
  const registrationYear = yearIsoOfDate(registrationDate);

  const weekServiceById = new Map(
    (weekServices ?? []).map((s) => [s.id, s as WeekServiceInfo])
  );
  const currentWeekStats = weekEntriesStats(
    (currentWeekEntries ?? []) as WeekEntry[],
    weekServiceById
  );
  const previousWeekStats = weekEntriesStats(
    (previousWeekEntries ?? []) as WeekEntry[],
    weekServiceById
  );
  const weekDeltaUsd = currentWeekStats.totalUsd - previousWeekStats.totalUsd;
  const weekHeadline =
    weekDeltaUsd > 0
      ? "La semaine a été meilleure"
      : weekDeltaUsd < 0
        ? "La semaine a été moins bonne"
        : "La semaine a été stable";

  // Une seule recommandation, basée sur un signal réel plutôt que
  // générique : d'abord la cause la plus actionnable (absences sans
  // acompte), puis une tendance (plus d'absences que la semaine passée),
  // sinon un message positif s'il n'y a rien à signaler.
  let weekTip: string;
  if (currentWeekStats.noShows.length === 0) {
    weekTip = "Aucune absence cette semaine — continuez ainsi.";
  } else if (
    currentWeekStats.noShows.every(
      (e) => (weekServiceById.get(e.service_id ?? "")?.deposit_usd ?? 0) === 0
    )
  ) {
    const names = Array.from(
      new Set(
        currentWeekStats.noShows.map(
          (e) => weekServiceById.get(e.service_id ?? "")?.name ?? "ce service"
        )
      )
    );
    const plural = currentWeekStats.noShows.length > 1;
    weekTip = `${plural ? "Les absences concernaient" : "L'absence concernait"} des prestations sans acompte (${names.join(", ")}). Demandez un acompte, même symbolique, sur ${plural ? "ces prestations aussi" : "cette prestation aussi"}.`;
  } else if (currentWeekStats.noShows.length > previousWeekStats.noShows.length) {
    weekTip =
      "Les absences augmentent par rapport à la semaine passée. Envoyez un rappel WhatsApp la veille du rendez-vous.";
  } else {
    weekTip =
      "Continuez à demander un acompte avant chaque rendez-vous : c'est ce qui limite le plus les absences.";
  }

  const allEntries = entries ?? [];

  const serviceIds = [
    ...new Set(allEntries.map((e) => e.service_id).filter((id): id is string => !!id)),
  ];
  const { data: services } = serviceIds.length
    ? await supabase
        .from("services")
        .select("id, name, price_usd")
        .in("id", serviceIds)
    : { data: [] };
  const serviceById = new Map((services ?? []).map((s) => [s.id, s]));

  const totalUsd = allEntries
    .filter((e) => REVENUE_STATUSES.includes(e.status))
    .reduce((sum, e) => {
      const service = e.service_id ? serviceById.get(e.service_id) : undefined;
      return sum + (service?.price_usd ?? 0);
    }, 0);

  const exportParams = new URLSearchParams({ type, [type]: value });
  if (staffFilter) {
    exportParams.set("staff", staffFilter);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <DashboardNav />

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        Rapport
      </h1>

      <div className="mb-6 rounded-2xl bg-ink-900 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
          Ma semaine · {formatWeekLabel(week)}
        </p>
        <p className="mt-2 font-serif text-xl text-paper">{weekHeadline}</p>
        <p className="mt-2 text-sm leading-relaxed text-paper/90">
          Vous avez encaissé{" "}
          <span className="font-bold text-kino-300">
            ${currentWeekStats.totalUsd.toFixed(2)} (
            {formatCdf(currentWeekStats.totalUsd)})
          </span>
          , soit{" "}
          <span className="font-bold text-kino-300">
            ${Math.abs(weekDeltaUsd).toFixed(2)} (
            {formatCdf(Math.abs(weekDeltaUsd))}) de{" "}
            {weekDeltaUsd >= 0 ? "plus" : "moins"}
          </span>{" "}
          que la semaine passée.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-ink-900/10 bg-white p-5 dark:border-paper/10 dark:bg-ink-800">
        <p className="mb-3 text-sm font-bold text-ink-900 dark:text-paper">
          Ce qui se vend le plus cette semaine
        </p>
        {currentWeekStats.topServices.length === 0 && (
          <p className="text-sm text-ink-400">
            Aucune vente enregistrée cette semaine.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {currentWeekStats.topServices.map((s, i) => {
            const maxUsd = currentWeekStats.topServices[0]?.totalUsd || 1;
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
                    className={
                      i === 0
                        ? "h-full bg-ink-900 dark:bg-paper"
                        : "h-full bg-kino-400"
                    }
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink-900/10 bg-white p-5 dark:border-paper/10 dark:bg-ink-800">
          <p className="mb-2 text-sm font-bold text-ink-900 dark:text-paper">
            Absences cette semaine
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-danger">
              {currentWeekStats.noShows.length}
            </span>
            <span className="text-sm text-ink-400">
              sur {currentWeekStats.totalBookings} rendez-vous
              <br />
              (la semaine passée : {previousWeekStats.noShows.length})
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-kino-200 bg-kino-50 p-5 dark:border-kino-800 dark:bg-ink-800">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-kino-700 dark:text-kino-300">
            Une chose à essayer
          </p>
          <p className="text-sm leading-relaxed text-ink-900 dark:text-paper">
            {weekTip}
          </p>
        </div>
      </div>

      <hr className="mb-6 border-ink-900/10 dark:border-paper/10" />

      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-400">
        Rapport par période
      </h2>

      <div className="mb-4 flex gap-2">
        {PERIOD_TABS.map((tab) => (
          <Link
            key={tab.type}
            href={`/dashboard/rapports?type=${tab.type}`}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              type === tab.type
                ? "bg-kino-400 text-ink-900"
                : "border border-ink-900/16 text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <input type="hidden" name="type" value={type} />
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            {PERIOD_TABS.find((t) => t.type === type)?.label}
          </label>
          {type === "week" && (
            <input
              type="week"
              name="week"
              defaultValue={value}
              min={registrationWeek}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          )}
          {type === "month" && (
            <input
              type="month"
              name="month"
              defaultValue={value}
              min={registrationMonth}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          )}
          {type === "quarter" && (
            <select
              name="quarter"
              defaultValue={value}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            >
              {quartersSince(registrationQuarter).map((q) => (
                <option key={q} value={q}>
                  {formatQuarterLabel(q)}
                </option>
              ))}
            </select>
          )}
          {type === "year" && (
            <select
              name="year"
              defaultValue={value}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            >
              {yearsSince(registrationYear).map((y) => (
                <option key={y} value={y}>
                  {formatYearLabel(y)}
                </option>
              ))}
            </select>
          )}
        </div>
        {staffMembers && staffMembers.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
              Membre de l&apos;équipe
            </label>
            <select
              name="staff"
              defaultValue={staffFilter ?? ""}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            >
              <option value="">Toute l&apos;équipe</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Afficher
        </button>
        <a
          href={`/dashboard/rapports/export?${exportParams.toString()}`}
          className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
        >
          Exporter en CSV
        </a>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
          <span className="block text-xs font-bold uppercase tracking-widest text-ink-400">
            Encaissé — {periodLabel(type, value)}
          </span>
          <span className="text-2xl font-bold text-ink-900 dark:text-paper">
            ${totalUsd.toFixed(2)}
          </span>
          <p className="mt-1 text-xs text-ink-400">
            {formatCdf(totalUsd)}
          </p>
        </div>
        <div className="rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
          <span className="block text-xs font-bold uppercase tracking-widest text-ink-400">
            Réservations
          </span>
          <span className="text-2xl font-bold text-ink-900 dark:text-paper">
            {allEntries.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Client</th>
              <th className="p-3">Service</th>
              <th className="p-3">Membre</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Réf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {allEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-ink-400">
                  Aucune réservation pour cette période.
                </td>
              </tr>
            )}
            {allEntries.map((e) => {
              const service = e.service_id
                ? serviceById.get(e.service_id)
                : undefined;
              return (
                <tr key={e.id}>
                  <td className="p-3 text-ink-400">
                    {new Date(e.start_time).toLocaleString("fr-FR", {
                      timeZone: "Africa/Kinshasa",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 font-medium text-ink-900 dark:text-paper">
                    {e.client_name ?? "—"}
                    <span className="block text-xs font-normal text-ink-400">
                      {e.client_phone_display}
                    </span>
                  </td>
                  <td className="p-3 text-ink-400">
                    {service?.name ?? "—"}
                  </td>
                  <td className="p-3 text-ink-400">
                    {e.staff_name ?? "—"}
                  </td>
                  <td className="p-3 font-bold text-kino-600 dark:text-kino-300">
                    {service ? `$${service.price_usd.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-ink-400">
                    {statusLabels[e.status] ?? e.status}
                  </td>
                  <td className="p-3 text-ink-400">
                    {formatBookingReference(e.reference_number)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
