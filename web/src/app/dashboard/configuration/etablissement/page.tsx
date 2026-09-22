import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { BusinessInfoForm } from "./business-info-form";
import { BusinessHoursForm } from "./business-hours-form";
import { deleteBusinessHour } from "./business-hours-actions";

const weekdayLabels = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/**
 * Regroupe en une page : les informations de l'établissement (nom,
 * catégorie, adresse, commune, ville, WhatsApp — jamais modifiables
 * après l'inscription jusqu'ici) et les heures d'ouverture du salon
 * (business_hours, migration 0026) — simple jour/début/fin, sans créneau
 * ni capacité. Le créneau et la capacité se configurent PAR membre de
 * l'équipe dans Horaires et capacité (/dashboard/agenda), qui reste aussi
 * la page de référence pour les congés/indisponibilités.
 */
export default async function EtablissementConfigPage() {
  const profile = await getCurrentProfile();

  if (!profile?.business_id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Aucun établissement associé à votre compte.
      </div>
    );
  }

  if (!canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Accès réservé au gérant de l&apos;établissement.
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: business }, { data: hours }] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "name, categories, address, commune, city, owner_whatsapp, description"
      )
      .eq("id", profile.business_id)
      .maybeSingle(),
    supabase
      .from("business_hours")
      .select("id, weekday, start_time, end_time")
      .eq("business_id", profile.business_id)
      .order("weekday")
      .order("start_time"),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/dashboard/configuration"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à la configuration
      </Link>

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        Mon établissement
      </h1>

      <BusinessInfoForm
        name={business?.name ?? ""}
        categories={business?.categories ?? []}
        address={business?.address ?? ""}
        commune={business?.commune ?? ""}
        city={business?.city ?? ""}
        whatsapp={business?.owner_whatsapp ?? ""}
        description={business?.description ?? ""}
      />

      <hr className="my-8 border-ink-900/10 dark:border-paper/10" />

      <h2 className="mb-2 text-lg font-bold text-ink-900 dark:text-paper">
        Heure d&apos;ouverture
      </h2>
      <p className="mb-4 text-sm text-ink-400">
        Quand votre salon est ouvert. Le créneau et la capacité se
        configurent par membre de l&apos;équipe, ainsi que les congés et
        indisponibilités ponctuelles, dans{" "}
        <Link href="/dashboard/agenda" className="font-bold underline">
          Horaires et capacité
        </Link>
        .
      </p>

      <BusinessHoursForm />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
            <tr>
              <th className="p-3">Jour</th>
              <th className="p-3">Horaire</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {(!hours || hours.length === 0) && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-ink-400">
                  Aucune heure d&apos;ouverture configurée pour l&apos;instant.
                </td>
              </tr>
            )}
            {hours?.map((hour) => (
              <tr key={hour.id}>
                <td className="p-3 font-medium text-ink-900 dark:text-paper">
                  {weekdayLabels[hour.weekday]}
                </td>
                <td className="p-3 text-ink-400">
                  {hour.start_time.slice(0, 5)} – {hour.end_time.slice(0, 5)}
                </td>
                <td className="p-3 text-right">
                  <form action={deleteBusinessHour}>
                    <input type="hidden" name="id" value={hour.id} />
                    <ConfirmDeleteButton />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
