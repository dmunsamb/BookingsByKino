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
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
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
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Retour au tableau de bord
      </Link>

      <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
        Rapports
      </h1>

      <div className="mb-4 flex gap-2">
        {PERIOD_TABS.map((tab) => (
          <Link
            key={tab.type}
            href={`/dashboard/rapports?type=${tab.type}`}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              type === tab.type
                ? "bg-kino-500 text-slate-950"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <input type="hidden" name="type" value={type} />
        <div>
          <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
            {PERIOD_TABS.find((t) => t.type === type)?.label}
          </label>
          {type === "week" && (
            <input
              type="week"
              name="week"
              defaultValue={value}
              className="rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          )}
          {type === "month" && (
            <input
              type="month"
              name="month"
              defaultValue={value}
              className="rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          )}
          {type === "quarter" && (
            <select
              name="quarter"
              defaultValue={value}
              className="rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
              className="rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
          className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
        >
          Afficher
        </button>
        <a
          href={`/dashboard/rapports/export?${exportParams.toString()}`}
          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Exporter en CSV
        </a>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-xs font-bold uppercase text-slate-500">
            Encaissé — {periodLabel(type, value)}
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
            ${totalUsd.toFixed(2)}
          </span>
          <p className="mt-1 text-xs text-slate-400">
            {formatCdf(totalUsd)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-xs font-bold uppercase text-slate-500">
            Réservations
          </span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {allEntries.length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Client</th>
              <th className="p-3">Service</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Réf.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {allEntries.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">
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
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {new Date(e.start_time).toLocaleString("fr-FR", {
                      timeZone: "Africa/Kinshasa",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {e.client_name ?? "—"}
                    <span className="block text-xs font-normal text-slate-400">
                      {e.client_phone_display}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {service?.name ?? "—"}
                  </td>
                  <td className="p-3 font-bold text-kino-600">
                    {service ? `$${service.price_usd.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {statusLabels[e.status] ?? e.status}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
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
