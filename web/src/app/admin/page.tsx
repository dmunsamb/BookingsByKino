import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { approveBusiness, rejectBusiness } from "./actions";

const statusLabels: Record<string, string> = {
  pending_approval: "En attente",
  approved: "Validé",
  rejected: "Refusé",
};

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        Accès réservé à l&apos;équipe KinoBooking.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, sub_category, address, city, image_url, signup_status, created_at"
    )
    .order("created_at", { ascending: false });

  const businessIds = (businesses ?? []).map((b) => b.id);
  const { data: owners } = businessIds.length
    ? await supabase
        .from("profiles")
        .select("business_id, full_name")
        .in("business_id", businessIds)
        .eq("role", "owner")
    : { data: [] };

  const ownerNameByBusiness = new Map(
    (owners ?? []).map((o) => [o.business_id, o.full_name])
  );

  const pending = (businesses ?? []).filter(
    (b) => b.signup_status === "pending_approval"
  );
  const others = (businesses ?? []).filter(
    (b) => b.signup_status !== "pending_approval"
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
        Administration KinoBooking
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Inscriptions en attente de validation
        </h2>
        <div className="space-y-3">
          {pending.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              Aucune inscription en attente.
            </p>
          )}
          {pending.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {b.name}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    ({b.sub_category ?? b.main_category})
                  </span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gérant : {ownerNameByBusiness.get(b.id) ?? "—"}
                  {(b.address || b.city) && (
                    <> · {[b.address, b.city].filter(Boolean).join(", ")}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <form action={approveBusiness}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-kino-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-kino-600"
                  >
                    Approuver
                  </button>
                </form>
                <form action={rejectBusiness}>
                  <input type="hidden" name="id" value={b.id} />
                  <ConfirmDeleteButton label="Refuser" />
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tous les établissements
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="p-3">Établissement</th>
                <th className="p-3">Gérant</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {others.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-400">
                    Aucun autre établissement.
                  </td>
                </tr>
              )}
              {others.map((b) => (
                <tr key={b.id}>
                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                    {b.name}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {ownerNameByBusiness.get(b.id) ?? "—"}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {statusLabels[b.signup_status] ?? b.signup_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
