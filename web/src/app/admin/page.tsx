import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  getSubscriptionStatus,
  subscriptionStatusLabels,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { rejectBusiness, updateSubscriptionPrices } from "./actions";
import { SubscriptionPaymentDialog } from "./subscription-payment-dialog";

const statusLabels: Record<string, string> = {
  pending_approval: "En attente",
  approved: "Validé",
  rejected: "Refusé",
};

const statusBadgeClasses: Record<SubscriptionStatus, string> = {
  actif:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  en_attente:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  inactif: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const DURATION_MONTHS = [1, 3, 12] as const;

function TestBadge() {
  return (
    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-950 dark:text-purple-300">
      Test
    </span>
  );
}

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        Accès réservé à l&apos;équipe KinoBooking.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, sub_category, address, city, signup_status, subscription_paid_until, owner_whatsapp, is_test, created_at"
    )
    .order("created_at", { ascending: false });

  const { data: prices } = await supabase
    .from("subscription_prices")
    .select("duration_months, amount_usd");

  const priceByDuration = Object.fromEntries(
    DURATION_MONTHS.map((m) => [
      m,
      prices?.find((p) => p.duration_months === m)?.amount_usd ?? 0,
    ])
  ) as Record<(typeof DURATION_MONTHS)[number], number>;

  const businessIds = (businesses ?? []).map((b) => b.id);
  const { data: owners } = businessIds.length
    ? await supabase
        .from("profiles")
        .select("business_id, full_name")
        .in("business_id", businessIds)
        .eq("role", "owner")
    : { data: [] };

  const ownerNameByBusiness = new Map(
    (owners ?? []).map((o) => [o.business_id, o.full_name])
  );

  const pending = (businesses ?? []).filter(
    (b) => b.signup_status === "pending_approval"
  );
  const approved = (businesses ?? []).filter(
    (b) => b.signup_status === "approved"
  );
  const rejected = (businesses ?? []).filter(
    (b) => b.signup_status === "rejected"
  );

  const approvedWithStatus = approved.map((b) => ({
    ...b,
    subscriptionStatus: getSubscriptionStatus(b.subscription_paid_until),
  }));
  const needsAttention = approvedWithStatus.filter(
    (b) => b.subscriptionStatus !== "actif"
  );

  const needsAttentionIds = needsAttention.map((b) => b.id);
  const { data: stuckBookings } = needsAttentionIds.length
    ? await supabase
        .from("agenda_entries")
        .select("id, business_id, client_name, start_time")
        .in("business_id", needsAttentionIds)
        .eq("status", "pending_approval")
        .order("start_time")
    : { data: [] };

  const stuckBookingsByBusiness = new Map<
    string,
    { id: string; client_name: string | null; start_time: string }[]
  >();
  for (const entry of stuckBookings ?? []) {
    const list = stuckBookingsByBusiness.get(entry.business_id) ?? [];
    list.push(entry);
    stuckBookingsByBusiness.set(entry.business_id, list);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
        Administration KinoBooking
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tarifs d&apos;abonnement
        </h2>
        <form
          action={updateSubscriptionPrices}
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end sm:gap-4"
        >
          {DURATION_MONTHS.map((m) => (
            <div key={m} className="flex-1">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                {m === 12 ? "1 an" : `${m} mois`} ($)
              </label>
              <input
                name={`price_${m}`}
                type="number"
                min="0"
                step="0.01"
                defaultValue={priceByDuration[m]}
                className="w-full rounded-xl border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          ))}
          <button
            type="submit"
            className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
          >
            Enregistrer les tarifs
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Ces montants apparaissent en présélection lors de
          l&apos;enregistrement d&apos;un paiement gérant, avec toujours la
          possibilité de saisir un autre montant.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Inscriptions en attente de validation
        </h2>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Aucune inscription en attente.
            </p>
          )}
          {pending.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="font-bold text-slate-900 dark:text-white">
                {b.name}{" "}
                <span className="text-xs font-normal text-slate-400">
                  ({b.sub_category ?? b.main_category})
                </span>{" "}
                {b.is_test && <TestBadge />}
              </p>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Gérant : {ownerNameByBusiness.get(b.id) ?? "—"}
                {(b.address || b.city) && (
                  <> · {[b.address, b.city].filter(Boolean).join(", ")}</>
                )}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SubscriptionPaymentDialog
                  businessId={b.id}
                  businessName={b.name}
                  prices={priceByDuration}
                  mode="approve"
                  triggerLabel="Approuver"
                />
                <form action={rejectBusiness}>
                  <input type="hidden" name="id" value={b.id} />
                  <ConfirmDeleteButton label="Refuser" />
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Abonnements à régulariser
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Un établissement inactif reste visible dans le catalogue, mais sa
          fiche masque ses coordonnées et n&apos;accepte plus de nouvelles
          réservations tant que le gérant n&apos;a pas régularisé.
        </p>
        <div className="space-y-3">
          {needsAttention.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Tous les abonnements sont à jour.
            </p>
          )}
          {needsAttention.map((b) => {
            const stuck = stuckBookingsByBusiness.get(b.id) ?? [];
            const reminderLink = b.owner_whatsapp
              ? buildWhatsAppLink(
                  b.owner_whatsapp,
                  `Bonjour, votre abonnement KinoBooking pour "${b.name}" ${
                    b.subscriptionStatus === "inactif"
                      ? "est inactif"
                      : "arrive à échéance"
                  }.${
                    stuck.length > 0
                      ? ` Vous avez ${stuck.length} réservation${
                          stuck.length > 1 ? "s" : ""
                        } en attente que vous ne pouvez pas encore traiter.`
                      : ""
                  } Merci de régulariser pour retrouver l'accès complet. Contactez-nous pour connaître les modalités de paiement.`
                )
              : null;

            return (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {b.name} {b.is_test && <TestBadge />}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClasses[b.subscriptionStatus]}`}
                  >
                    {subscriptionStatusLabels[b.subscriptionStatus]}
                  </span>
                </div>
                {stuck.length > 0 && (
                  <p className="mb-2 text-xs font-bold text-red-600">
                    {stuck.length} réservation{stuck.length > 1 ? "s" : ""} en
                    attente bloquée{stuck.length > 1 ? "s" : ""} pour ce
                    gérant.
                  </p>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SubscriptionPaymentDialog
                    businessId={b.id}
                    businessName={b.name}
                    prices={priceByDuration}
                    mode="renew"
                    triggerLabel="Ils ont payé leur abonnement"
                  />
                  {reminderLink ? (
                    <a
                      href={reminderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
                    >
                      Rappel WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Pas de numéro WhatsApp fourni
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tous les établissements
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="p-3">Établissement</th>
                <th className="p-3">Gérant</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {approved.length === 0 && rejected.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-400">
                    Aucun autre établissement.
                  </td>
                </tr>
              )}
              {approvedWithStatus.map((b) => (
                <tr key={b.id}>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {b.name} {b.is_test && <TestBadge />}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {ownerNameByBusiness.get(b.id) ?? "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClasses[b.subscriptionStatus]}`}
                    >
                      {subscriptionStatusLabels[b.subscriptionStatus]}
                    </span>
                  </td>
                </tr>
              ))}
              {rejected.map((b) => (
                <tr key={b.id}>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {b.name} {b.is_test && <TestBadge />}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {ownerNameByBusiness.get(b.id) ?? "—"}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {statusLabels[b.signup_status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
