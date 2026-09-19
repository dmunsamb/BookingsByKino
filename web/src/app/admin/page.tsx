import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  getSubscriptionStatus,
  subscriptionStatusLabels,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { SubscriptionPaymentDialog } from "./subscription-payment-dialog";
import { SubscriptionPricesForm } from "./subscription-prices-form";
import {
  PlatformPaymentSettingsForm,
  type PlatformPaymentSettings,
} from "./platform-payment-settings-form";
import { PendingSignupsSection } from "./pending-signups-section";
import { TestBadge } from "./test-badge";
import Link from "next/link";

const statusLabels: Record<string, string> = {
  pending_approval: "En attente",
  approved: "Validé",
  rejected: "Refusé",
};

const statusBadgeClasses: Record<SubscriptionStatus, string> = {
  actif:
    "bg-success/10 text-success",
  en_attente:
    "bg-kino-100 text-kino-700 dark:bg-kino-900 dark:text-kino-300",
  inactif: "bg-danger/10 text-danger",
};

const DURATION_MONTHS = [1, 3, 12] as const;

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Accès réservé à l&apos;équipe KinoBooking.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, address, city, signup_status, subscription_paid_until, owner_whatsapp, is_test, created_at"
    )
    .neq("signup_status", "pending_approval")
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

  const { data: paymentSettingsRow } = await supabase
    .from("platform_payment_settings")
    .select(
      "mpesa_number, mpesa_holder_name, orange_money_number, orange_money_holder_name, contact_name, contact_whatsapp"
    )
    .eq("id", true)
    .maybeSingle();

  const platformPaymentSettings: PlatformPaymentSettings = {
    mpesaNumber: paymentSettingsRow?.mpesa_number ?? "",
    mpesaHolderName: paymentSettingsRow?.mpesa_holder_name ?? "",
    orangeMoneyNumber: paymentSettingsRow?.orange_money_number ?? "",
    orangeMoneyHolderName: paymentSettingsRow?.orange_money_holder_name ?? "",
    contactName: paymentSettingsRow?.contact_name ?? "",
    contactWhatsapp: paymentSettingsRow?.contact_whatsapp ?? "",
  };

  // Passe par business_owners (plutôt que profiles.business_id
  // directement) : un gérant qui possède plusieurs établissements n'a
  // qu'un seul business_id "actif" à la fois — ses autres établissements
  // ne s'y retrouveraient pas sinon (voir migration 0021).
  const businessIds = (businesses ?? []).map((b) => b.id);
  const { data: ownerLinks } = businessIds.length
    ? await supabase
        .from("business_owners")
        .select("business_id, profile_id")
        .in("business_id", businessIds)
    : { data: [] };

  const ownerProfileIds = [
    ...new Set((ownerLinks ?? []).map((l) => l.profile_id)),
  ];
  const { data: ownerProfiles } = ownerProfileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerProfileIds)
    : { data: [] };

  const nameByProfileId = new Map(
    (ownerProfiles ?? []).map((p) => [p.id, p.full_name])
  );
  const ownerNameByBusiness = new Map(
    (ownerLinks ?? []).map((l) => [
      l.business_id,
      nameByProfileId.get(l.profile_id) ?? null,
    ])
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
  // Approuvé "sous réserve" (voir approveBusiness, migration 0029) :
  // jamais facturé, donc "actif" par défaut (getSubscriptionStatus) —
  // sans cette liste séparée, ces établissements n'apparaîtraient nulle
  // part tant que le premier paiement n'a pas été enregistré.
  const neverBilled = approvedWithStatus.filter(
    (b) => b.subscription_paid_until === null
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink-900 dark:text-paper">
          Administration KinoBooking
        </h1>
        <Link
          href="/admin/rapports"
          className="text-xs font-bold text-kino-600 hover:underline dark:text-kino-500"
        >
          Rapports financiers →
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
          Tarifs d&apos;abonnement
        </h2>
        <SubscriptionPricesForm initialPrices={priceByDuration} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
          Numéros de paiement KinoBooking
        </h2>
        <PlatformPaymentSettingsForm initial={platformPaymentSettings} />
      </section>

      <PendingSignupsSection />

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
          Premier paiement à enregistrer
        </h2>
        <p className="mb-3 text-xs text-ink-400">
          Approuvé, accès déjà donné — l&apos;abonnement n&apos;est pas
          encore facturé (on ne pénalise pas un gérant avant sa première
          échéance). Enregistrez ici le paiement dès qu&apos;il arrive.
        </p>
        <div className="space-y-3">
          {neverBilled.length === 0 && (
            <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
              Aucun premier paiement en attente.
            </p>
          )}
          {neverBilled.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-bold text-ink-900 dark:text-paper">
                {b.name} {b.is_test && <TestBadge />}
                <span className="ml-2 text-xs font-normal text-ink-400">
                  {ownerNameByBusiness.get(b.id) ?? "—"}
                </span>
              </p>
              <SubscriptionPaymentDialog
                businessId={b.id}
                businessName={b.name}
                prices={priceByDuration}
                triggerLabel="Ils ont payé leur abonnement"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
          Abonnements à régulariser
        </h2>
        <p className="mb-3 text-xs text-ink-400">
          Un établissement inactif reste visible dans le catalogue, mais sa
          fiche masque ses coordonnées et n&apos;accepte plus de nouvelles
          réservations tant que le gérant n&apos;a pas régularisé.
        </p>
        <div className="space-y-3">
          {needsAttention.length === 0 && (
            <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
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
                className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-bold text-ink-900 dark:text-paper">
                    {b.name} {b.is_test && <TestBadge />}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClasses[b.subscriptionStatus]}`}
                  >
                    {subscriptionStatusLabels[b.subscriptionStatus]}
                  </span>
                </div>
                {stuck.length > 0 && (
                  <p className="mb-2 text-xs font-bold text-danger">
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
                    triggerLabel="Ils ont payé leur abonnement"
                  />
                  {reminderLink ? (
                    <a
                      href={reminderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-ink-400 hover:underline"
                    >
                      Rappel WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-ink-400">
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
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
          Tous les établissements
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
              <tr>
                <th className="p-3">Établissement</th>
                <th className="p-3">Gérant</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
              {approved.length === 0 && rejected.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-ink-400">
                    Aucun autre établissement.
                  </td>
                </tr>
              )}
              {approvedWithStatus.map((b) => (
                <tr key={b.id}>
                  <td className="p-3 font-medium text-ink-900 dark:text-paper">
                    {b.name} {b.is_test && <TestBadge />}
                  </td>
                  <td className="p-3 text-ink-400">
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
                  <td className="p-3 font-medium text-ink-900 dark:text-paper">
                    {b.name} {b.is_test && <TestBadge />}
                  </td>
                  <td className="p-3 text-ink-400">
                    {ownerNameByBusiness.get(b.id) ?? "—"}
                  </td>
                  <td className="p-3 text-ink-400">
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
