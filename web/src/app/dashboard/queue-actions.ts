"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isStaffMember } from "@/lib/auth/dal";

/**
 * "Prise en charge" (US demandée) : assigner un membre de l'équipe fait
 * passer le ticket de "en attente" à "en cours" côté dashboard — sans
 * nouveau statut en base, la distinction se fait uniquement sur staff_id
 * (voir dashboard/page.tsx), plus simple qu'un enum supplémentaire.
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

  const { data: queueRows } = await supabase
    .from("agenda_entries")
    .select("id, created_at, queue_bumped_at, queue_shift_used")
    .eq("business_id", profile.business_id)
    .eq("source", "walk_in")
    .eq("status", "confirmed")
    .is("staff_id", null);

  if (!queueRows) return;

  const sortKey = (r: { created_at: string; queue_bumped_at: string | null }) =>
    new Date(r.queue_bumped_at ?? r.created_at).getTime();

  const ordered = queueRows.slice().sort((a, b) => sortKey(a) - sortKey(b));
  const currentIndex = ordered.findIndex((r) => r.id === id);
  if (currentIndex === -1) return;

  const current = ordered[currentIndex];
  if (current.queue_shift_used) return;

  const targetIndex = Math.min(currentIndex + positions, ordered.length - 1);
  if (targetIndex === currentIndex) return;

  const newBumpedAt = new Date(sortKey(ordered[targetIndex]) + 1).toISOString();

  await supabase
    .from("agenda_entries")
    .update({ queue_bumped_at: newBumpedAt, queue_shift_used: true })
    .eq("id", id)
    .eq("business_id", profile.business_id);

  revalidatePath("/dashboard");
}
