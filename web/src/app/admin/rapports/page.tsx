import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthIso,
  monthRange,
  formatMonthLabel,
} from "@/lib/period-range";

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Accès réservé à l&apos;équipe KinoBooking.
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonthIso();
  const { start, end } = monthRange(month);

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("id, business_id, amount_usd, duration_months, recorded_at, recorded_by")
    .gte("recorded_at", start)
    .lt("recorded_at", end)
    .order("recorded_at", { ascending: false });

  const allPayments = payments ?? [];

  const businessIds = [...new Set(allPayments.map((p) => p.business_id))];
  const { data: businesses } = businessIds.length
    ? await supabase
        .from("businesses")
        .select("id, name, is_test")
        .in("id", businessIds)
    : { data: [] };
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));

  const recorderIds = [
    ...new Set(allPayments.map((p) => p.recorded_by).filter((id): id is string => !!id)),
  ];
  const { data: recorders } = recorderIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", recorderIds)
    : { data: [] };
  const recorderNameById = new Map(
    (recorders ?? []).map((r) => [r.id, r.full_name])
  );

  // Nouschka (pilote) est marquée is_test : ses paiements, s'il y en a,
  // ne représentent pas un vrai revenu et fausseraient le total.
  const realPayments = allPayments.filter(
    (p) => !businessById.get(p.business_id)?.is_test
  );
  const testCount = allPayments.length - realPayments.length;
  const totalUsd = realPayments.reduce(
    (sum, p) => sum + Number(p.amount_usd),
    0
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/admin"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à l&apos;administration
      </Link>

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        Rapports financiers
      </h1>

      <form
        method="GET"
        className="mb-6 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-400">
            Mois
          </label>
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="rounded-xl border border-ink-900/16 bg-white p-2 text-sm text-ink-900 focus:border-2 focus:border-kino-400 focus:outline-none dark:border-paper/16 dark:bg-ink-900 dark:text-paper"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Afficher
        </button>
        <a
          href={`/admin/rapports/export?month=${month}`}
          className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
        >
          Exporter en CSV
        </a>
      </form>

      <div className="mb-2 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
          <span className="block text-xs font-bold uppercase tracking-widest text-ink-400">
            Encaissé en {formatMonthLabel(month)}
          </span>
          <span className="text-2xl font-bold text-ink-900 dark:text-paper">
            ${totalUsd.toFixed(2)}
          </span>
        </div>
        <div className="rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800">
          <span className="block text-xs font-bold uppercase tracking-widest text-ink-400">
            Paiements enregistrés
          </span>
          <span className="text-2xl font-bold text-ink-900 dark:text-paper">
            {realPayments.length}
          </span>
        </div>
      </div>

      {testCount > 0 && (
        <p className="mb-4 text-xs text-ink-400">
          {testCount} paiement{testCount > 1 ? "s" : ""} d&apos;établissement
          {testCount > 1 ? "s" : ""} de test exclu{testCount > 1 ? "s" : ""} de
          ce rapport.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Établissement</th>
              <th className="p-3">Durée</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Enregistré par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {realPayments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-ink-400">
                  Aucun paiement enregistré pour ce mois.
                </td>
              </tr>
            )}
            {realPayments.map((p) => (
              <tr key={p.id}>
                <td className="p-3 text-ink-400">
                  {new Date(p.recorded_at).toLocaleDateString("fr-FR", {
                    timeZone: "Africa/Kinshasa",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="p-3 font-medium text-ink-900 dark:text-paper">
                  {businessById.get(p.business_id)?.name ?? "—"}
                </td>
                <td className="p-3 text-ink-400">
                  {p.duration_months === 12
                    ? "1 an"
                    : `${p.duration_months} mois`}
                </td>
                <td className="p-3 font-bold text-kino-600 dark:text-kino-300">
                  ${Number(p.amount_usd).toFixed(2)}
                </td>
                <td className="p-3 text-ink-400">
                  {(p.recorded_by && recorderNameById.get(p.recorded_by)) ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
