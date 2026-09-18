import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { StaffForm } from "./staff-form";
import { deleteStaffMember, toggleStaffActive } from "./actions";

export default async function EquipePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return <p className="p-8 text-sm text-ink-400">Compte non configuré.</p>;
  }

  if (!profile.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
        Aucun établissement n&apos;est encore associé à votre compte.
      </div>
    );
  }

  if (!canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
        Seul le gérant peut gérer l&apos;équipe.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff_members")
    .select("id, name, active")
    .eq("business_id", profile.business_id)
    .order("created_at");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-900 dark:text-paper">
          Équipe
        </h1>
        <p className="text-sm text-ink-400">
          Assignez un membre de l&apos;équipe à une réservation depuis sa
          fiche — purement pour vous organiser, sans effet sur les
          disponibilités affichées aux clientes.
        </p>
      </div>

      <StaffForm />

      <div className="space-y-2">
        {(!staff || staff.length === 0) && (
          <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Aucun membre de l&apos;équipe pour l&apos;instant.
          </p>
        )}
        {staff?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl border border-ink-900/10 bg-white p-3 text-sm dark:border-paper/10 dark:bg-ink-800"
          >
            <span
              className={
                s.active
                  ? "font-bold text-ink-900 dark:text-paper"
                  : "text-ink-400 line-through"
              }
            >
              {s.name}
            </span>
            <div className="flex items-center gap-3">
              <form action={toggleStaffActive}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="active" value={(!s.active).toString()} />
                <button
                  type="submit"
                  className="text-xs font-bold text-ink-400 hover:underline"
                >
                  {s.active ? "Marquer inactif" : "Réactiver"}
                </button>
              </form>
              <form action={deleteStaffMember}>
                <input type="hidden" name="id" value={s.id} />
                <ConfirmDeleteButton />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
