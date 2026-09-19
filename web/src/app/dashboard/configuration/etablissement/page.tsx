import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { BusinessInfoForm } from "./business-info-form";
import { AvailabilityForm } from "../../agenda/availability-form";
import { deleteAvailabilityRule } from "../../agenda/actions";

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
 * après l'inscription jusqu'ici) et les horaires d'ouverture
 * (réutilise AvailabilityForm/deleteAvailabilityRule de /dashboard/agenda,
 * qui reste la page de référence pour les congés/indisponibilités).
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
  const [{ data: business }, { data: rules }] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, categories, address, commune, city, owner_whatsapp")
      .eq("id", profile.business_id)
      .maybeSingle(),
    supabase
      .from("availability_rules")
      .select("id, weekday, start_time, end_time, slot_duration_minutes, capacity")
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
      />

      <hr className="my-8 border-ink-900/10 dark:border-paper/10" />

      <h2 className="mb-2 text-lg font-bold text-ink-900 dark:text-paper">
        Heure d&apos;ouverture
      </h2>
      <p className="mb-4 text-sm text-ink-400">
        Ces plages déterminent les créneaux proposés aux clients. Pour les
        congés et indisponibilités ponctuelles, direction{" "}
        <Link href="/dashboard/agenda" className="font-bold underline">
          Horaires et capacité
        </Link>
        .
      </p>

      <AvailabilityForm />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
            <tr>
              <th className="p-3">Jour</th>
              <th className="p-3">Horaire</th>
              <th className="p-3">Durée créneau</th>
              <th className="p-3">Capacité</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {(!rules || rules.length === 0) && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-ink-400">
                  Aucun horaire configuré pour l&apos;instant.
                </td>
              </tr>
            )}
            {rules?.map((rule) => (
              <tr key={rule.id}>
                <td className="p-3 font-medium text-ink-900 dark:text-paper">
                  {weekdayLabels[rule.weekday]}
                </td>
                <td className="p-3 text-ink-400">
                  {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
                </td>
                <td className="p-3 text-ink-400">
                  {rule.slot_duration_minutes} min
                </td>
                <td className="p-3 text-ink-400">{rule.capacity}</td>
                <td className="p-3 text-right">
                  <form action={deleteAvailabilityRule}>
                    <input type="hidden" name="id" value={rule.id} />
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
