import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/auth/dal";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatCdf } from "@/lib/currency";
import { logout, updateBookingStatus } from "./actions";

const roleLabels: Record<Profile["role"], string> = {
  owner: "Gérant / Propriétaire",
  staff: "Personnel",
  platform_admin: "Administrateur KinoBooking",
};

type BookingRow = {
  id: string;
  service_id: string | null;
  client_name: string | null;
  client_phone_display: string | null;
  start_time: string;
  end_time: string | null;
};

type ServiceInfo = { name: string; price_usd: number };

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
}: {
  entry: BookingRow;
  services: Map<string, ServiceInfo>;
  actions?: ReactNode;
}) {
  const service = entry.service_id ? services.get(entry.service_id) : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-slate-900 dark:text-white">
          {entry.client_name ?? "Client"} —{" "}
          {service?.name ?? "Service inconnu"}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {formatDateTime(entry.start_time)} · {entry.client_phone_display}
        </p>
        {service && (
          <p className="mt-1 text-sm font-bold text-kino-600">
            ${service.price_usd.toFixed(2)} ({formatCdf(service.price_usd)})
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

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
  let confirmedUpcoming: BookingRow[] = [];
  let waitingPayment: BookingRow[] = [];
  let recentlyCancelled: BookingRow[] = [];
  let serviceInfo = new Map<string, ServiceInfo>();

  if (profile.business_id) {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const [
      { data: pendingData },
      { data: confirmedData },
      { data: waitingData },
      { data: cancelledData },
      { data: servicesData },
    ] = await Promise.all([
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "pending_approval")
        .order("start_time"),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "confirmed")
        .gte("start_time", nowIso)
        .order("start_time")
        .limit(20),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "approved_waiting_payment")
        .order("start_time"),
      supabase
        .from("agenda_entries_for_dashboard")
        .select(
          "id, service_id, client_name, client_phone_display, start_time, end_time"
        )
        .eq("business_id", profile.business_id)
        .eq("status", "geannuleerd")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("services")
        .select("id, name, price_usd")
        .eq("business_id", profile.business_id),
    ]);

    pending = pendingData ?? [];
    confirmedUpcoming = confirmedData ?? [];
    waitingPayment = waitingData ?? [];
    recentlyCancelled = cancelledData ?? [];
    serviceInfo = new Map(
      (servicesData ?? []).map((s) => [s.id, { name: s.name, price_usd: s.price_usd }])
    );
  }

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

      {!profile.business_id ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Aucun établissement n&apos;est encore associé à votre compte.
          Contactez l&apos;administrateur KinoBooking.
        </p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Nouvelles demandes
            </h2>
            <div className="space-y-3">
              {pending.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  Aucune demande en attente pour l&apos;instant.
                </p>
              )}
              {pending.map((entry) => (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  actions={
                    <>
                      <form action={updateBookingStatus}>
                        <input type="hidden" name="id" value={entry.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button
                          type="submit"
                          className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                        >
                          Confirmer
                        </button>
                      </form>
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
            <div className="space-y-3">
              {waitingPayment.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  Aucune réservation en attente de paiement.
                </p>
              )}
              {waitingPayment.map((entry) => (
                <BookingCard
                  key={entry.id}
                  entry={entry}
                  services={serviceInfo}
                  actions={
                    <>
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
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Annulées récemment
            </h2>
            <div className="space-y-3">
              {recentlyCancelled.length === 0 && (
                <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  Aucune réservation annulée récemment.
                </p>
              )}
              {recentlyCancelled.map((entry) => (
                <BookingCard key={entry.id} entry={entry} services={serviceInfo} />
              ))}
            </div>
          </section>
        </>
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
        </div>
      </section>
    </div>
  );
}
