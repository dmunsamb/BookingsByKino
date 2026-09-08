import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  getSubscriptionStatus,
  subscriptionStatusLabels,
  type SubscriptionStatus,
} from "@/lib/subscription";
import { approveBusiness, rejectBusiness, recordSubscriptionPayment } from "./actions";

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

function DurationRadios({ name }: { name: string }) {
  return (
    <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-300">
      {[
        { value: 1, label: "1 mois" },
        { value: 3, label: "3 mois" },
        { value: 12, label: "1 an" },
      ].map((opt) => (
        <label key={opt.value} className="flex items-center gap-1">
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={opt.value === 1}
          />
          {opt.label}
        </label>
      ))}
    </div>
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
      "id, name, main_category, sub_category, address, city, signup_status, subscription_paid_until, owner_whatsapp, created_at"
    )
    .order("created_at", { ascending: false });

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
                </span>
              </p>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Gérant : {ownerNameByBusiness.get(b.id) ?? "—"}
                {(b.address || b.city) && (
                  <> · {[b.address, b.city].filter(Boolean).join(", ")}</>
                )}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <form action={approveBusiness} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={b.id} />
                  <DurationRadios name="months" />
                  <button
                    type="submit"
                    className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                  >
                    Approuver
                  </button>
                </form>
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
          Un établissement inactif reste ouvert aux réservations pendant un
          mois de plus — les demandes qui arrivent pendant ce temps restent
          bloquées tant que le gérant n&apos;a pas régularisé.
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
                    {b.name}
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
                  <form
                    action={recordSubscriptionPayment}
                    className="flex items-center gap-3"
                  >
                    <input type="hidden" name="id" value={b.id} />
                    <DurationRadios name="months" />
                    <button
                      type="submit"
                      className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                    >
                      Marquer payé
                    </button>
                  </form>
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
                    {b.name}
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
                    {b.name}
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
