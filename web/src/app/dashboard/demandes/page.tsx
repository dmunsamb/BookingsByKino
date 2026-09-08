import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { confirmRequest, refuseRequest } from "./actions";

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

export default async function DemandesPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <p className="p-8 text-sm text-slate-500 dark:text-slate-400">
        Compte non configuré.
      </p>
    );
  }

  if (!profile.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Aucun établissement n&apos;est encore associé à votre compte. Contactez
        l&apos;administrateur KinoBooking.
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: requests }, { data: services }] = await Promise.all([
    supabase
      .from("agenda_entries_for_dashboard")
      .select(
        "id, service_id, client_name, client_phone_display, start_time, end_time"
      )
      .eq("business_id", profile.business_id)
      .eq("status", "pending_approval")
      .order("start_time"),
    supabase
      .from("services")
      .select("id, name")
      .eq("business_id", profile.business_id),
  ]);

  const serviceNames = new Map((services ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Demandes de réservation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Validez ou refusez les demandes envoyées par vos clients. Tant que
          vous n&apos;avez pas répondu, aucune réservation n&apos;est
          engageante pour votre établissement.
        </p>
      </div>

      <div className="space-y-3">
        {(!requests || requests.length === 0) && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            Aucune demande en attente pour l&apos;instant.
          </p>
        )}
        {requests?.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {r.client_name ?? "Client"} —{" "}
                {serviceNames.get(r.service_id ?? "") ?? "Service inconnu"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(r.start_time)} · {r.client_phone_display}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <form action={confirmRequest}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                >
                  Confirmer
                </button>
              </form>
              <form action={refuseRequest}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmDeleteButton label="Refuser" />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
