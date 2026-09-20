import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/auth/dal";
import {
  getCurrentProfile,
  canManageBusiness,
  isStaffMember,
} from "@/lib/auth/dal";
import { getSubscriptionStatus } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatCdf } from "@/lib/currency";
import { logout, updateBookingStatus } from "./actions";
import { ValidateWithWhatsAppButton } from "./validate-with-whatsapp-button";
import { ConfirmPaymentWithWhatsAppButton } from "./confirm-payment-with-whatsapp-button";
import {
  buildWhatsAppLink,
  formatMobileMoneyAccounts,
  type MobileMoneyAccount,
  type MobileMoneyProvider,
} from "@/lib/whatsapp";
import { formatBookingReference } from "@/lib/booking-reference";
import { PendingSignupsSection } from "@/app/admin/pending-signups-section";
import { BusinessSwitcher, type OwnedBusiness } from "./business-switcher";
import { DashboardNav } from "./dashboard-nav";

const roleLabels: Record<Profile["role"], string> = {
  owner: "Gérant / Propriétaire",
  staff: "Personnel",
  platform_admin: "Administrateur KinoBooking",
};

const historyStatusLabels: Record<string, string> = {
  geannuleerd: "Annulée",
  termine: "Terminée",
  no_show: "No-show",
};

type BookingRow = {
  id: string;
  service_id: string | null;
  client_name: string | null;
  client_phone_display: string | null;
  start_time: string;
  end_time: string | null;
  reference_number: number;
  staff_name: string | null;
};

type HistoryRow = BookingRow & { status: string };

type ServiceInfo = { name: string; price_usd: number; deposit_usd: number };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ouvre directement la conversation WhatsApp du client, sans message
 * prérempli : WhatsApp n'offre pas de lien "appel direct" fiable
 * multiplateforme, donc le gérant atterrit dans le chat et appuie
 * lui-même sur l'icône d'appel — utile pour discuter d'un empêchement
 * ou proposer un autre créneau, quel que soit le statut de la réservation.
 */
function CallButton({
  phone,
  enabled,
}: {
  phone: string | null;
  enabled: boolean;
}) {
  if (!enabled || !phone) return null;
  return (
    <a
      href={buildWhatsAppLink(phone, "")}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
    >
      Appeler
    </a>
  );
}

function BookingCard({
  entry,
  services,
  actions,
  editHref,
  statusLabel,
  showDeposit,
}: {
  entry: BookingRow;
  services: Map<string, ServiceInfo>;
  actions?: ReactNode;
  editHref?: string;
  statusLabel?: string;
  showDeposit?: boolean;
}) {
  const service = entry.service_id ? services.get(entry.service_id) : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-900/12 bg-white p-4 shadow-sm dark:border-paper/12 dark:bg-ink-800 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-ink-900 dark:text-paper">
          {entry.client_name ?? "Client"} —{" "}
          {service?.name ?? "Service inconnu"}
          {entry.staff_name && (
            <span className="font-normal text-ink-400"> · avec {entry.staff_name}</span>
          )}
          {statusLabel && (
            <span className="ml-2 rounded bg-ink-900/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400 dark:bg-paper/10">
              {statusLabel}
            </span>
          )}
        </p>
        <p className="text-sm text-ink-400">
          {formatDateTime(entry.start_time)} · {entry.client_phone_display} ·
          Réf. {formatBookingReference(entry.reference_number)}
        </p>
        {service && !showDeposit && (
          <p className="mt-1 text-sm font-bold text-kino-600 dark:text-kino-300">
            ${service.price_usd.toFixed(2)} ({formatCdf(service.price_usd)})
          </p>
        )}
        {service && showDeposit && (
          <p className="mt-1 text-sm font-bold text-kino-600 dark:text-kino-300">
            Acompte attendu : ${service.deposit_usd.toFixed(2)} (
            {formatCdf(service.deposit_usd)})
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {editHref && (
          <Link
            href={editHref}
            className="text-xs font-bold text-ink-400 hover:underline"
          >
            Modifier
          </Link>
        )}
        {actions}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <div>
          <p className="mb-2 font-bold text-ink-900 dark:text-paper">
            Compte non configuré
          </p>
          <p className="text-sm text-ink-400">
            Votre compte existe mais n&apos;est lié à aucun profil
            KinoBooking. Contactez l&apos;administrateur.
          </p>
        </div>
      </div>
    );
  }

  let ownedBusinesses: OwnedBusiness[] = [];
  if (profile.role === "owner") {
    const supabaseForSwitcher = await createClient();
    const { data: ownerLinks } = await supabaseForSwitcher
      .from("business_owners")
      .select("business_id")
      .eq("profile_id", profile.id);
    const ownedIds = (ownerLinks ?? []).map((l) => l.business_id);
    if (ownedIds.length > 0) {
      const { data } = await supabaseForSwitcher
        .from("businesses")
        .select("id, name, signup_status")
        .in("id", ownedIds);
      ownedBusinesses = data ?? [];
    }
  }

  let pending: BookingRow[] = [];
  let queueWaiting: BookingRow[] = [];
  let toClose: BookingRow[] = [];
  let confirmedUpcoming: BookingRow[] = [];
  let waitingPayment: BookingRow[] = [];
  let history: HistoryRow[] = [];
  let serviceInfo = new Map<string, ServiceInfo>();
  let businessName = "";
  let mobileMoneyAccounts: MobileMoneyAccount[] = [];
  let subscriptionStatus: ReturnType<typeof getSubscriptionStatus> = "actif";

  if (profile.business_id) {
    const supabase = await createClient();

    const { data: businessStatusCheck } = await supabase
      .from("businesses")
      .select("signup_status, subscription_paid_until")
      .eq("id", profile.business_id)
      .maybeSingle();

    if (
      businessStatusCheck &&
      businessStatusCheck.signup_status !== "approved"
    ) {
      return (
        <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
          {ownedBusinesses.length > 1 && (
            <div className="mb-6 flex justify-center">
              <BusinessSwitcher
                businesses={ownedBusinesses}
                currentBusinessId={profile.business_id}
              />
            </div>
          )}
          {businessStatusCheck.signup_status === "pending_approval" && (
            <>
              <h1 className="mb-2 text-lg font-bold text-ink-900 dark:text-paper">
                Inscription en attente de validation
              </h1>
              <p className="text-sm text-ink-400">
                Merci de votre inscription ! L&apos;équipe KinoBooking va
                valider votre établissement sous peu. Vous recevrez un
                accès complet dès que ce sera fait.
              </p>
            </>
          )}
          {businessStatusCheck.signup_status === "awaiting_payment" && (
            <>
              <h1 className="mb-2 text-lg font-bold text-ink-900 dark:text-paper">
                Inscription approuvée sous conditions
              </h1>
              <p className="text-sm text-ink-400">
                Votre établissement a été approuvé ! Il ne reste que le
                paiement de votre abonnement pour activer votre accès —
                vous devriez avoir reçu un message WhatsApp avec les
                détails. Contactez-nous si besoin.
              </p>
            </>
          )}
          {businessStatusCheck.signup_status === "rejected" && (
            <>
              <h1 className="mb-2 text-lg font-bold text-ink-900 dark:text-paper">
                Inscription non validée
              </h1>
              <p className="text-sm text-ink-400">
                Votre inscription n&apos;a pas été validée par KinoBooking.
                Contactez-nous pour plus d&apos;informations.
              </p>
            </>
          )}
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-ink-900/16 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      );
    }

    subscriptionStatus = getSubscriptionStatus(
      businessStatusCheck?.subscription_paid_until ?? null
    );

    // platform_admin garde toujours accès (support/gestion), même sur un
    // établissement qu'il ne fait que superviser. Le blocage ne vise que
    // le gérant/personnel de l'établissement concerné.
    if (subscriptionStatus === "inactif" && isStaffMember(profile) && profile.role !== "platform_admin") {
      return (
        <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
          {ownedBusinesses.length > 1 && (
            <div className="mb-6 flex justify-center">
              <BusinessSwitcher
                businesses={ownedBusinesses}
                currentBusinessId={profile.business_id}
              />
            </div>
          )}
          <h1 className="mb-2 text-lg font-bold text-ink-900 dark:text-paper">
            Compte suspendu
          </h1>
          <p className="text-sm text-ink-400">
            Votre compte est inactif. Veuillez régulariser votre abonnement
            KinoBooking pour retrouver l&apos;accès à votre tableau de bord.
            Les demandes de réservation continuent d&apos;arriver le temps
            que vous régularisiez.
          </p>
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-ink-900/16 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      );
    }

    const nowIso = new Date().toISOString();

    const [
      { data: pendingData },
      { data: queueData },
      { data: toCloseData },
      { data: confirmedData },
      { data: waitingData },
      { data: historyData },
      { data: servicesData },
      { data: businessData },
    ] = await Promise.all([
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, staff_name"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "pending_approval")
        .order("start_time"),
      // File d'attente "sans rendez-vous" (US-C4) : tickets walk_in pas
      // encore clôturés, triés par ordre d'arrivée (created_at), pas par
      // start_time — plusieurs tickets pris dans le même créneau
      // partagent le même start_time et perdraient leur ordre réel.
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, staff_name"
        )
        .eq("business_id", profile.business_id)
        .eq("source", "walk_in")
        .eq("status", "confirmed")
        .order("created_at"),
      // Un rendez-vous confirmé dont l'heure est passée n'a plus sa place
      // dans "à venir" : il faut le clôturer (service rendu / no-show),
      // pas l'annuler après coup. Les tickets walk_in ont leur propre
      // section (file d'attente) juste au-dessus.
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, staff_name"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "confirmed")
        .neq("source", "walk_in")
        .lt("start_time", nowIso)
        .order("start_time")
        .limit(20),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, staff_name"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "confirmed")
        .neq("source", "walk_in")
        .gte("start_time", nowIso)
        .order("start_time")
        .limit(20),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, staff_name"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "approved_waiting_payment")
        .order("start_time"),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, status, staff_name"
        )
        .eq("business_id", profile.business_id)
        .in("status", ["geannuleerd", "termine", "no_show"])
        .order("start_time", { ascending: false })
        .limit(15),
      supabase
        .from("services")
        .select("id, name, price_usd, deposit_usd")
        .eq("business_id", profile.business_id),
      supabase
        .from("businesses")
        .select(
          "name, mpesa_number, mpesa_holder_name, orange_money_number, orange_money_holder_name, airtel_money_number, airtel_money_holder_name"
        )
        .eq("id", profile.business_id)
        .maybeSingle(),
    ]);

    pending = pendingData ?? [];
    queueWaiting = queueData ?? [];
    toClose = toCloseData ?? [];
    confirmedUpcoming = confirmedData ?? [];
    waitingPayment = waitingData ?? [];
    history = historyData ?? [];
    serviceInfo = new Map(
      (servicesData ?? []).map((s) => [
        s.id,
        { name: s.name, price_usd: s.price_usd, deposit_usd: s.deposit_usd },
      ])
    );
    businessName = businessData?.name ?? "";
    mobileMoneyAccounts = (
      [
        ["mpesa", businessData?.mpesa_number, businessData?.mpesa_holder_name],
        [
          "orange_money",
          businessData?.orange_money_number,
          businessData?.orange_money_holder_name,
        ],
        [
          "airtel_money",
          businessData?.airtel_money_number,
          businessData?.airtel_money_holder_name,
        ],
      ] as [
        MobileMoneyProvider,
        string | null | undefined,
        string | null | undefined,
      ][]
    )
      .filter(([, number]) => !!number)
      .map(([provider, number, holderName]) => ({
        provider,
        number: number as string,
        holderName: holderName ?? null,
      }));
  }

  const mobileMoneyLabelForMessage = formatMobileMoneyAccounts(
    mobileMoneyAccounts,
    " ou "
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <DashboardNav />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink-900 dark:text-paper">
            Bonjour, {profile.full_name ?? "utilisateur"}
          </h1>
          <p className="text-sm text-ink-400">
            {roleLabels[profile.role] ?? profile.role}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl border border-ink-900/16 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      {profile.role === "owner" && profile.business_id && (
        <BusinessSwitcher
          businesses={ownedBusinesses}
          currentBusinessId={profile.business_id}
        />
      )}

      {profile.business_id && subscriptionStatus === "en_attente" && (
        <div className="mb-6 rounded-xl border border-kino-200 bg-kino-50 p-4 text-sm text-ink-900 dark:border-kino-800 dark:bg-ink-800 dark:text-paper">
          <span className="font-bold">Abonnement en attente de paiement.</span>{" "}
          Régularisez sous peu pour éviter la suspension de votre accès au
          tableau de bord.
        </div>
      )}

      {!profile.business_id ? (
        profile.role === "platform_admin" ? (
          <>
            <PendingSignupsSection showEmptyState />
            <Link
              href="/admin"
              className="block rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
            >
              <span className="font-bold text-ink-900 dark:text-paper">
                Panel d&apos;administration complet
              </span>
              <p className="mt-1 text-ink-400">
                Tarifs, abonnements à régulariser, tous les établissements.
              </p>
            </Link>
          </>
        ) : (
          <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Aucun établissement n&apos;est encore associé à votre compte.
            Contactez l&apos;administrateur KinoBooking.
          </p>
        )
      ) : (
        <>
          {profile.role === "platform_admin" && (
            <PendingSignupsSection showEmptyState={false} />
          )}

          {isStaffMember(profile) && (
            <div className="mb-6 flex justify-end">
              <Link
                href="/dashboard/reservations/new"
                className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
              >
                + Nouvelle réservation
              </Link>
            </div>
          )}

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              Nouvelles demandes
            </h2>
            <p className="mb-3 text-xs text-ink-400">
              Valider une demande la fait passer en attente d&apos;acompte et
              ouvre WhatsApp avec un message prérempli pour le client
              (montant et numéro mobile money inclus) — à vous de l&apos;envoyer.
            </p>
            <div className="space-y-3">
              {pending.length === 0 && (
                <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
                  Aucune demande en attente pour l&apos;instant.
                </p>
              )}
              {pending.map((entry) => {
                const service = entry.service_id
                  ? serviceInfo.get(entry.service_id)
                  : undefined;
                const whatsAppLink =
                  canManageBusiness(profile) &&
                  entry.client_phone_display &&
                  service
                    ? buildWhatsAppLink(
                        entry.client_phone_display,
                        `Bonjour ${entry.client_name ?? ""}, votre demande pour "${
                          service.name
                        }" le ${formatDateTime(entry.start_time)} chez ${
                          businessName
                        } a bien été reçue et validée ! Pour bloquer cette réservation, merci d'envoyer l'acompte de $${service.deposit_usd.toFixed(
                          2
                        )} (${formatCdf(service.deposit_usd)})${
                          mobileMoneyLabelForMessage
                            ? ` via ${mobileMoneyLabelForMessage}`
                            : ""
                        } puis de nous le confirmer ici une fois fait. Référence : ${formatBookingReference(
                          entry.reference_number
                        )}. Merci !`
                      )
                    : null;
                return (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  editHref={
                    canManageBusiness(profile)
                      ? `/dashboard/reservations/${entry.id}`
                      : undefined
                  }
                  actions={
                    <>
                      <CallButton
                        phone={entry.client_phone_display}
                        enabled={canManageBusiness(profile)}
                      />
                      <ValidateWithWhatsAppButton
                        bookingId={entry.id}
                        whatsAppLink={whatsAppLink}
                      />
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input
                          type="hidden"
                          name="status"
                          value="geannuleerd"
                        />
                        <ConfirmDeleteButton label="Refuser" />
                      </form>
                    </>
                  }
                />
                );
              })}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              File d&apos;attente (sans rendez-vous)
              {queueWaiting.length > 0 && ` — ${queueWaiting.length}`}
            </h2>
            <p className="mb-3 text-xs text-ink-400">
              Tickets pris sur place sans rendez-vous, dans l&apos;ordre
              d&apos;arrivée. Clôturez chaque ticket une fois le client pris
              en charge pour faire avancer la file.
            </p>
            <div className="space-y-3">
              {queueWaiting.length === 0 && (
                <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
                  Personne en attente pour l&apos;instant.
                </p>
              )}
              {queueWaiting.map((entry, index) => (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  statusLabel={`Ticket ${index + 1}`}
                  actions={
                    <>
                      <CallButton
                        phone={entry.client_phone_display}
                        enabled={canManageBusiness(profile)}
                      />
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="termine" />
                        <button
                          type="submit"
                          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
                        >
                          Service rendu
                        </button>
                      </form>
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <ConfirmDeleteButton label="Parti(e)" dismissLabel="Non" />
                      </form>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              Rendez-vous passés à clôturer
            </h2>
            <div className="space-y-3">
              {toClose.length === 0 && (
                <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
                  Aucun rendez-vous en attente de clôture.
                </p>
              )}
              {toClose.map((entry) => (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  actions={
                    <>
                      <CallButton
                        phone={entry.client_phone_display}
                        enabled={canManageBusiness(profile)}
                      />
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="termine" />
                        <button
                          type="submit"
                          className="rounded-xl bg-kino-400 px-4 py-2 text-xs font-bold text-ink-900 transition hover:bg-kino-500"
                        >
                          Service rendu
                        </button>
                      </form>
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <button
                          type="submit"
                          className="rounded-xl border border-ink-900/16 px-4 py-2 text-xs font-bold text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
                        >
                          No-show
                        </button>
                      </form>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              Réservations confirmées à venir
            </h2>
            <div className="space-y-3">
              {confirmedUpcoming.length === 0 && (
                <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
                  Aucune réservation confirmée à venir.
                </p>
              )}
              {confirmedUpcoming.map((entry) => (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  editHref={
                    canManageBusiness(profile)
                      ? `/dashboard/reservations/${entry.id}`
                      : undefined
                  }
                  actions={
                    <>
                      <CallButton
                        phone={entry.client_phone_display}
                        enabled={canManageBusiness(profile)}
                      />
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input
                          type="hidden"
                          name="status"
                          value="geannuleerd"
                        />
                        <ConfirmDeleteButton label="Annuler" dismissLabel="Non" />
                      </form>
                    </>
                  }
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              En attente de paiement
            </h2>
            <p className="mb-3 text-xs text-ink-400">
              Une fois l&apos;acompte reçu sur votre compte mobile money,
              cliquez sur « Marquer payé » : la réservation est confirmée et
              WhatsApp s&apos;ouvre avec un message prérempli pour le client
              (accusé de réception de l&apos;acompte, rendez-vous confirmé,
              nom du membre de l&apos;équipe si assigné) — à vous de
              l&apos;envoyer. Le délai de 30 minutes est indicatif — aucune
              annulation automatique n&apos;a lieu.
            </p>
            <div className="space-y-3">
              {waitingPayment.length === 0 && (
                <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
                  Aucune réservation en attente de paiement.
                </p>
              )}
              {waitingPayment.map((entry) => {
                const service = entry.service_id
                  ? serviceInfo.get(entry.service_id)
                  : undefined;
                const resendLink =
                  canManageBusiness(profile) &&
                  entry.client_phone_display &&
                  service
                    ? buildWhatsAppLink(
                        entry.client_phone_display,
                        `Bonjour ${entry.client_name ?? ""}, pour rappel : pour bloquer votre réservation "${
                          service.name
                        }" chez ${businessName}, merci d'envoyer l'acompte de $${service.deposit_usd.toFixed(
                          2
                        )} (${formatCdf(service.deposit_usd)})${
                          mobileMoneyLabelForMessage
                            ? ` via ${mobileMoneyLabelForMessage}`
                            : ""
                        } puis de nous le confirmer ici une fois fait. Référence : ${formatBookingReference(
                          entry.reference_number
                        )}. Merci !`
                      )
                    : null;
                const confirmationLink =
                  canManageBusiness(profile) &&
                  entry.client_phone_display &&
                  service
                    ? buildWhatsAppLink(
                        entry.client_phone_display,
                        `Bonjour ${entry.client_name ?? ""}, nous avons bien reçu votre acompte de $${service.deposit_usd.toFixed(
                          2
                        )} (${formatCdf(service.deposit_usd)}) pour "${
                          service.name
                        }" le ${formatDateTime(entry.start_time)} chez ${businessName}. Votre rendez-vous est confirmé${
                          entry.staff_name ? ` avec ${entry.staff_name}` : ""
                        } ! Référence : ${formatBookingReference(
                          entry.reference_number
                        )}. À bientôt !`
                      )
                    : null;

                return (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  showDeposit
                  editHref={
                    canManageBusiness(profile)
                      ? `/dashboard/reservations/${entry.id}`
                      : undefined
                  }
                  actions={
                    <>
                      <CallButton
                        phone={entry.client_phone_display}
                        enabled={canManageBusiness(profile)}
                      />
                      {resendLink && (
                        <a
                          href={resendLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-ink-400 hover:underline"
                        >
                          Rappel WhatsApp
                        </a>
                      )}
                      <ConfirmPaymentWithWhatsAppButton
                        bookingId={entry.id}
                        whatsAppLink={confirmationLink}
                      />
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input
                          type="hidden"
                          name="status"
                          value="geannuleerd"
                        />
                        <ConfirmDeleteButton label="Annuler" dismissLabel="Non" />
                      </form>
                    </>
                  }
                />
                );
              })}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
              Historique récent
            </h2>
            <div className="space-y-3">
              {history.length === 0 && (
                <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
                  Aucun historique pour l&apos;instant.
                </p>
              )}
              {history.map((entry) => (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  statusLabel={historyStatusLabels[entry.status] ?? entry.status}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {profile.role === "platform_admin" && profile.business_id && (
        <section className="mb-8">
          <Link
            href="/admin"
            className="block rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
          >
            <span className="font-bold text-ink-900 dark:text-paper">
              Panel d&apos;administration complet
            </span>
            <p className="mt-1 text-ink-400">
              Tarifs, abonnements à régulariser, tous les établissements.
            </p>
          </Link>
        </section>
      )}

    </div>
  );
}
