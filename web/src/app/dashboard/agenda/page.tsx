import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AvailabilityForm } from "./availability-form";
import { deleteAvailabilityRule } from "./actions";

const weekdayLabels = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export default async function AgendaPage() {
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
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("id, weekday, start_time, end_time, slot_duration_minutes, capacity")
    .eq("business_id", profile.business_id)
    .order("weekday")
    .order("start_time");

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
          Horaires et capacité
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Définissez vos plages d&apos;ouverture et le nombre de places
          disponibles en parallèle par créneau. Ces réglages détermineront
          les créneaux réellement proposés aux clients (agenda centrale,
          voir docs section 4.9).
        </p>
      </div>

      {canManageBusiness(profile) && <AvailabilityForm />}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="p-3">Jour</th>
              <th className="p-3">Horaire</th>
              <th className="p-3">Durée créneau</th>
              <th className="p-3">Capacité</th>
              {canManageBusiness(profile) && (
                <th className="p-3 text-right">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(!rules || rules.length === 0) && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-400">
                  Aucun horaire configuré pour l&apos;instant.
                </td>
              </tr>
            )}
            {rules?.map((rule) => (
              <tr key={rule.id}>
                <td className="p-3 font-medium text-slate-900 dark:text-white">
                  {weekdayLabels[rule.weekday]}
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-300">
                  {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-300">
                  {rule.slot_duration_minutes} min
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-300">
                  {rule.capacity}
                </td>
                {canManageBusiness(profile) && (
                  <td className="p-3 text-right">
                    <form action={deleteAvailabilityRule}>
                      <input type="hidden" name="id" value={rule.id} />
                      <ConfirmDeleteButton />
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
