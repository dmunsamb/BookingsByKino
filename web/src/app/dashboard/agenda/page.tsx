import Link from "next/link";
import {
  getCurrentProfile,
  canManageBusiness,
  isStaffMember,
} from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AvailabilityForm } from "./availability-form";
import { BlockingForm } from "./blocking-form";
import { deleteAvailabilityRule, deleteBlockingGroup } from "./actions";

function formatBlockRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  const startTime = start.toLocaleTimeString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("fr-FR", {
    timeZone: "Africa/Kinshasa",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateLabel} · ${startTime}–${endTime}`;
}

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
      <p className="p-8 text-sm text-ink-400">
        Compte non configuré.
      </p>
    );
  }

  if (!profile.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
        Aucun établissement n&apos;est encore associé à votre compte. Contactez
        l&apos;administrateur KinoBooking.
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: rules }, { data: staff }, { data: blockRows }] =
    await Promise.all([
      supabase
        .from("availability_rules")
        .select(
          "id, weekday, start_time, end_time, slot_duration_minutes, capacity, staff_id"
        )
        .eq("business_id", profile.business_id)
        .order("weekday")
        .order("start_time"),
      supabase
        .from("staff_members")
        .select("id, name, active")
        .eq("business_id", profile.business_id)
        .order("name"),
      supabase
        .from("agenda_entries")
        .select("id, block_group_id, start_time, end_time, staff_id")
        .eq("business_id", profile.business_id)
        .eq("source", "blokkering")
        .gte("start_time", new Date().toISOString())
        .order("start_time"),
    ]);

  const staffNameById = new Map((staff ?? []).map((s) => [s.id, s.name]));
  const activeStaffMembers = (staff ?? []).filter((s) => s.active);

  const blockGroups = new Map<
    string,
    { id: string; start: string; end: string; staffId: string | null }
  >();
  for (const row of blockRows ?? []) {
    const key = row.block_group_id ?? row.id;
    const existing = blockGroups.get(key);
    if (!existing) {
      blockGroups.set(key, {
        id: key,
        start: row.start_time,
        end: row.end_time,
        staffId: row.staff_id,
      });
    } else {
      if (row.start_time < existing.start) existing.start = row.start_time;
      if (row.end_time > existing.end) existing.end = row.end_time;
    }
  }
  const blocks = Array.from(blockGroups.values()).sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink-900 dark:text-paper">
          Horaires et capacité
        </h1>
        <p className="text-sm text-ink-400">
          Chaque horaire est assigné à un membre de l&apos;équipe et
          détermine sa capacité (nombre de places en parallèle par
          créneau) — la capacité totale proposée aux clients est la somme
          des membres présents à un moment donné. L&apos;horaire doit
          rester compris dans les heures d&apos;ouverture du salon
          (Configuration → Mon établissement).
        </p>
      </div>

      {canManageBusiness(profile) &&
        (activeStaffMembers.length > 0 ? (
          <AvailabilityForm staffMembers={activeStaffMembers} />
        ) : (
          <p className="rounded-2xl border border-ink-900/10 bg-white p-4 text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Ajoutez d&apos;abord un membre de l&apos;équipe pour lui définir
            un horaire —{" "}
            <Link href="/dashboard/equipe" className="font-bold underline">
              Équipe
            </Link>
            .
          </p>
        ))}

      <div className="mt-8 overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
            <tr>
              <th className="p-3">Jour</th>
              <th className="p-3">Membre</th>
              <th className="p-3">Horaire</th>
              <th className="p-3">Durée créneau</th>
              <th className="p-3">Capacité</th>
              {canManageBusiness(profile) && (
                <th className="p-3 text-right">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {(!rules || rules.length === 0) && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-ink-400">
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
                  {rule.staff_id ? staffNameById.get(rule.staff_id) ?? "—" : "—"}
                </td>
                <td className="p-3 text-ink-400">
                  {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
                </td>
                <td className="p-3 text-ink-400">
                  {rule.slot_duration_minutes} min
                </td>
                <td className="p-3 text-ink-400">
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

      <div className="mt-10">
        <h2 className="text-lg font-bold text-ink-900 dark:text-paper">
          Congés et indisponibilités
        </h2>
        <p className="mb-4 text-sm text-ink-400">
          Bloque une plage horaire pour un membre précis (ex. maladie) ou
          toute l&apos;équipe (ex. congé collectif) : elle n&apos;apparaît
          plus disponible pour les nouvelles réservations en ligne
          (FR-9.3).
        </p>

        {isStaffMember(profile) && (
          <BlockingForm staffMembers={activeStaffMembers} />
        )}

        <div className="space-y-2">
          {blocks.length === 0 && (
            <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
              Aucun blocage à venir.
            </p>
          )}
          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-2xl border border-ink-900/10 bg-white p-3 text-sm dark:border-paper/10 dark:bg-ink-800"
            >
              <span className="text-ink-900 dark:text-paper">
                {formatBlockRange(b.start, b.end)}
                <span className="ml-2 text-xs font-bold text-ink-400">
                  {b.staffId
                    ? staffNameById.get(b.staffId) ?? "—"
                    : "Toute l'équipe"}
                </span>
              </span>
              {isStaffMember(profile) && (
                <form action={deleteBlockingGroup}>
                  <input type="hidden" name="block_group_id" value={b.id} />
                  <ConfirmDeleteButton />
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
