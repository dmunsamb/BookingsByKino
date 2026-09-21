"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isStaffMember } from "@/lib/auth/dal";

type QueueOrderRow = {
  id: string;
  created_at: string;
  queue_bumped_at: string | null;
};

function queueSortKey(r: { created_at: string; queue_bumped_at: string | null }) {
  return new Date(r.queue_bumped_at ?? r.created_at).getTime();
}

/** File d'attente "en attente" (staff_id vide), dans son ordre réel —
 * coalesce(queue_bumped_at, created_at), que Postgrest ne sait pas trier
 * directement (voir aussi dashboard/page.tsx). */
async function fetchOrderedWaitingQueue<T extends QueueOrderRow>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  select: string
): Promise<T[]> {
  const { data } = await supabase
    .from("agenda_entries")
    .select(select)
    .eq("business_id", businessId)
    .eq("source", "walk_in")
    .eq("status", "confirmed")
    .is("staff_id", null);

  return ((data ?? []) as unknown as T[])
    .slice()
    .sort((a, b) => queueSortKey(a) - queueSortKey(b));
}

/**
 * "Prise en charge" (US demandée) : assigner un membre de l'équipe fait
 * passer le ticket de "en attente" à "en cours" côté dashboard — sans
 * nouveau statut en base, la distinction se fait uniquement sur staff_id
 * (voir dashboard/page.tsx), plus simple qu'un enum supplémentaire.
 *
 * Deux contraintes dures, revérifiées ici (pas seulement côté UI) : le
 * risque réel signalé étant qu'un client paie pour passer devant tout le
 * monde, l'action DOIT être bloquée pour quiconque n'est pas le numéro 1
 * de la file, même si la requête est envoyée directement en contournant
 * l'interface. De même, le membre choisi doit être actif et qualifié
 * pour le service demandé (staff_member_services, migration 0034 :
 * aucune ligne = qualifié pour tout, sinon liste explicite).
 */
export async function assignStaffToQueue(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !isStaffMember(profile)) return;

  const id = formData.get("id");
  const staffId = formData.get("staff_id");
  if (typeof id !== "string" || typeof staffId !== "string" || !staffId) {
    return;
  }

  const supabase = await createClient();

  const ordered = await fetchOrderedWaitingQueue<
    QueueOrderRow & { service_id: string | null }
  >(supabase, profile.business_id, "id, created_at, queue_bumped_at, service_id");

  const first = ordered[0];
  if (!first || first.id !== id) return;

  const { data: staffMember } = await supabase
    .from("staff_members")
    .select("id, active, staff_member_services(service_id)")
    .eq("id", staffId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (!staffMember || !staffMember.active) return;

  const restrictions = staffMember.staff_member_services as
    | { service_id: string }[]
    | null;
  const isQualified =
    !restrictions ||
    restrictions.length === 0 ||
    (first.service_id != null &&
      restrictions.some((r) => r.service_id === first.service_id));
  if (!isQualified) return;

  await supabase
    .from("agenda_entries")
    .update({ staff_id: staffId })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard");
}

/**
 * "Décaler" (US demandée) : laisser passer 1, 2 ou 3 personnes sans
 * perdre définitivement sa place, une seule fois par ticket. Recalcule
 * la position cible dans la file EN COURS plutôt que de renvoyer
 * simplement le ticket à la fin — queue_bumped_at devient la nouvelle
 * clé de tri (coalesce(queue_bumped_at, created_at), voir migration
 * 0033 et dashboard/page.tsx).
 */
export async function shiftQueuePosition(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id || !isStaffMember(profile)) return;

  const id = formData.get("id");
  const positions = Number(formData.get("positions"));
  if (typeof id !== "string" || ![1, 2, 3].includes(positions)) return;

  const supabase = await createClient();

  const ordered = await fetchOrderedWaitingQueue<
    QueueOrderRow & { queue_shift_used: boolean }
  >(
    supabase,
    profile.business_id,
    "id, created_at, queue_bumped_at, queue_shift_used"
  );

  const currentIndex = ordered.findIndex((r) => r.id === id);
  if (currentIndex === -1) return;

  const current = ordered[currentIndex];
  if (current.queue_shift_used) return;

  const targetIndex = Math.min(currentIndex + positions, ordered.length - 1);
  if (targetIndex === currentIndex) return;

  const newBumpedAt = new Date(
    queueSortKey(ordered[targetIndex]) + 1
  ).toISOString();

  await supabase
    .from("agenda_entries")
    .update({ queue_bumped_at: newBumpedAt, queue_shift_used: true })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard");
}
