import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatCdf } from "@/lib/currency";
import { formatBookingReference } from "@/lib/booking-reference";
import {
  type PeriodType,
  currentWeekIso,
  weekRange,
  formatWeekLabel,
  currentMonthIso,
  monthRange,
  formatMonthLabel,
  currentQuarterIso,
  quarterRange,
  formatQuarterLabel,
  recentQuarters,
  currentYearIso,
  yearRange,
  formatYearLabel,
  recentYears,
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

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("agenda_entries_for_dashboard")
    .select(
      "id, service_id, client_name, client_phone_display, start_time, status, reference_number"
    )
    .eq("business_id", profile.business_id)
    .gte("start_time", start)
    .lt("start_time", end)
    .order("start_time");

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        Rapports
      </h1>

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
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          )}
          {type === "month" && (
            <input
              type="month"
              name="month"
              defaultValue={value}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            />
          )}
          {type === "quarter" && (
            <select
              name="quarter"
              defaultValue={value}
              className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
            >
              {recentQuarters(8).map((q) => (
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
              {recentYears(6).map((y) => (
                <option key={y} value={y}>
                  {formatYearLabel(y)}
                </option>
              ))}
            </select>
          )}
        </div>
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
              <th className="p-3">Montant</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Réf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {allEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-ink-400">
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
