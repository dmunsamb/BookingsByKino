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
import { MobileMoneyForm } from "./mobile-money-form";
import {
  buildWhatsAppLink,
  formatMobileMoneyAccounts,
  type MobileMoneyAccount,
  type MobileMoneyProvider,
} from "@/lib/whatsapp";
import { formatBookingReference } from "@/lib/booking-reference";

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
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-slate-900 dark:text-white">
          {entry.client_name ?? "Client"} —{" "}
          {service?.name ?? "Service inconnu"}
          {statusLabel && (
            <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              {statusLabel}
            </span>
          )}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {formatDateTime(entry.start_time)} · {entry.client_phone_display} ·
          Réf. {formatBookingReference(entry.reference_number)}
        </p>
        {service && !showDeposit && (
          <p className="mt-1 text-sm font-bold text-kino-600">
            ${service.price_usd.toFixed(2)} ({formatCdf(service.price_usd)})
          </p>
        )}
        {service && showDeposit && (
          <p className="mt-1 text-sm font-bold text-kino-600">
            Acompte attendu : ${service.deposit_usd.toFixed(2)} (
            {formatCdf(service.deposit_usd)})
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {editHref && (
          <Link
            href={editHref}
            className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
          >
            Modifier
          </Link>
        )}
        {actions}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ login_email?: string }>;
}) {
  const profile = await getCurrentProfile();
  const { login_email: loginEmail } = await searchParams;

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <div>
          <p className="mb-2 font-bold text-slate-900 dark:text-white">
            Compte non configuré
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Votre compte existe mais n&apos;est lié à aucun profil
            KinoBooking. Contactez l&apos;administrateur.
          </p>
        </div>
      </div>
    );
  }

  let pending: BookingRow[] = [];
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
          {businessStatusCheck.signup_status === "pending_approval" ? (
            <>
              <h1 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
                Inscription en attente de validation
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Merci de votre inscription ! L&apos;équipe KinoBooking va
                valider votre établissement sous peu. Vous recevrez un
                accès complet dès que ce sera fait.
              </p>
              {loginEmail && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Comme vous n&apos;avez pas donné d&apos;email, votre
                  identifiant de connexion est :{" "}
                  <span className="font-bold">{loginEmail}</span>. Notez-le
                  pour vous reconnecter.
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
                Inscription non validée
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Votre inscription n&apos;a pas été validée par KinoBooking.
                Contactez-nous pour plus d&apos;informations.
              </p>
            </>
          )}
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
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
          <h1 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
            Compte suspendu
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Votre compte est inactif. Veuillez régulariser votre abonnement
            KinoBooking pour retrouver l&apos;accès à votre tableau de bord.
            Les demandes de réservation continuent d&apos;arriver le temps
            que vous régularisiez.
          </p>
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
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
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "pending_approval")
        .order("start_time"),
      // Un rendez-vous confirmé dont l'heure est passée n'a plus sa place
      // dans "à venir" : il faut le clôturer (service rendu / no-show),
      // pas l'annuler après coup.
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "confirmed")
        .lt("start_time", nowIso)
        .order("start_time")
        .limit(20),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "confirmed")
        .gte("start_time", nowIso)
        .order("start_time")
        .limit(20),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "approved_waiting_payment")
        .order("start_time"),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time, reference_number, status"
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Bonjour, {profile.full_name ?? "utilisateur"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {roleLabels[profile.role] ?? profile.role}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      {profile.business_id && subscriptionStatus === "en_attente" && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-bold">Abonnement en attente de paiement.</span>{" "}
          Régularisez sous peu pour éviter la suspension de votre accès au
          tableau de bord.
        </div>
      )}

      {!profile.business_id ? (
        profile.role === "platform_admin" ? (
          <Link
            href="/admin"
            className="block rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="font-bold text-slate-900 dark:text-white">
              Administration KinoBooking
            </span>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Valider les inscriptions et gérer les établissements.
            </p>
          </Link>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Aucun établissement n&apos;est encore associé à votre compte.
            Contactez l&apos;administrateur KinoBooking.
          </p>
        )
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Nouvelles demandes
            </h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Valider une demande la fait passer en attente d&apos;acompte et
              ouvre WhatsApp avec un message prérempli pour le client
              (montant et numéro mobile money inclus) — à vous de l&apos;envoyer.
            </p>
            <div className="space-y-3">
              {pending.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Rendez-vous passés à clôturer
            </h2>
            <div className="space-y-3">
              {toClose.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="termine" />
                        <button
                          type="submit"
                          className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                        >
                          Service rendu
                        </button>
                      </form>
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="no_show" />
                        <button
                          type="submit"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
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
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Réservations confirmées à venir
            </h2>
            <div className="space-y-3">
              {confirmedUpcoming.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
                    <form action={updateBookingStatus}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="status" value="geannuleerd" />
                      <ConfirmDeleteButton label="Annuler" dismissLabel="Non" />
                    </form>
                  }
                />
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              En attente de paiement
            </h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Une fois l&apos;acompte reçu sur votre compte mobile money,
              cliquez sur « Marquer payé ». Le délai de 30 minutes est
              indicatif — aucune annulation automatique n&apos;a lieu.
            </p>
            <div className="space-y-3">
              {waitingPayment.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
                      {resendLink && (
                        <a
                          href={resendLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
                        >
                          Rappel WhatsApp
                        </a>
                      )}
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          type="submit"
                          className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                        >
                          Marquer payé
                        </button>
                      </form>
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
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Historique récent
            </h2>
            <div className="space-y-3">
              {history.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
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
            className="block rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="font-bold text-slate-900 dark:text-white">
              Administration KinoBooking
            </span>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Valider les inscriptions et gérer les établissements.
            </p>
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Réglages de l&apos;établissement
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard/agenda"
            className="rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="font-bold text-slate-900 dark:text-white">
              Horaires et capacité
            </span>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Configurer l&apos;agenda central de votre établissement.
            </p>
          </Link>
          <Link
            href="/dashboard/catalogue"
            className="rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="font-bold text-slate-900 dark:text-white">
              Catalogue &amp; tarifs
            </span>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Gérer les services proposés aux clients.
            </p>
          </Link>
          {profile.business_id && canManageBusiness(profile) && (
            <MobileMoneyForm accounts={mobileMoneyAccounts} />
          )}
        </div>
      </section>
    </div>
  );
}
