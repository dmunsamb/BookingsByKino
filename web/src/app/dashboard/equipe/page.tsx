import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { StaffForm } from "./staff-form";
import { StaffServicesForm } from "./staff-services-form";
import { deleteStaffMember, toggleStaffActive, updateStaffPhoto } from "./actions";

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
  const [{ data: staff }, { data: services }] = await Promise.all([
    supabase
      .from("staff_members")
      .select(
        "id, name, active, photo_url, staff_member_services(service_id)"
      )
      .eq("business_id", profile.business_id)
      .order("created_at"),
    supabase
      .from("services")
      .select("id, name")
      .eq("business_id", profile.business_id)
      .order("created_at"),
  ]);

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
          Ajoutez vos membres ici avant de leur définir un horaire dans{" "}
          <Link href="/dashboard/agenda" className="font-bold underline">
            Horaires et capacité
          </Link>
          . Vous pouvez aussi les assigner à une réservation depuis sa
          fiche.
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
            className="flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-white p-3 text-sm dark:border-paper/10 dark:bg-ink-800"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {s.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL de stockage externe
                  <img
                    src={s.photo_url}
                    alt={s.name}
                    loading="lazy"
                    className="h-10 w-10 flex-none rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-kino-100 text-sm font-bold text-kino-700 dark:bg-kino-900 dark:text-kino-300">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span
                  className={
                    s.active
                      ? "font-bold text-ink-900 dark:text-paper"
                      : "text-ink-400 line-through"
                  }
                >
                  {s.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <form
                  action={updateStaffPhoto}
                  encType="multipart/form-data"
                  className="flex items-center gap-1.5"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <input
                    type="file"
                    name="photo"
                    accept="image/jpeg,image/png,image/webp"
                    className="w-32 text-[10px] text-ink-400 file:mr-1.5 file:rounded-lg file:border-0 file:bg-kino-100 file:px-1.5 file:py-1 file:text-[10px] file:font-bold file:text-kino-700 dark:file:bg-kino-900 dark:file:text-kino-300"
                  />
                  <button
                    type="submit"
                    className="whitespace-nowrap text-xs font-bold text-ink-400 hover:underline"
                  >
                    {s.photo_url ? "Changer" : "Ajouter photo"}
                  </button>
                </form>
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
            <StaffServicesForm
              staffId={s.id}
              services={services ?? []}
              selectedServiceIds={(
                (s.staff_member_services ?? []) as { service_id: string }[]
              ).map((x) => x.service_id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
