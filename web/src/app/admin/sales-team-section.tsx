import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreateSalesRepForm } from "./create-sales-rep-form";
import { deleteSalesRep } from "./actions";

function formatMemberSince(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Équipe commerciale KINO CONGO — séparée du tableau des établissements
 * (qui liste déjà les gérants) : ici, les comptes internes qui n'ont pas
 * de salon à eux, avec le nombre de salons qui leur sont assignés (voir
 * business_sales_reps, migration 0035) et un moyen de leur retirer
 * l'accès.
 */
export async function SalesTeamSection() {
  const supabase = await createClient();

  const { data: salesReps } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "sales")
    .order("created_at", { ascending: false });

  const { data: assignments } = await supabase
    .from("business_sales_reps")
    .select("profile_id");

  const assignedCountByProfile = new Map<string, number>();
  for (const a of assignments ?? []) {
    assignedCountByProfile.set(
      a.profile_id,
      (assignedCountByProfile.get(a.profile_id) ?? 0) + 1
    );
  }

  // auth.users (email) n'est lisible qu'avec le client service-role — les
  // profils commerciaux sont peu nombreux, une résolution par id suffit.
  const adminClient = createAdminClient();
  const emailById = new Map<string, string>();
  await Promise.all(
    (salesReps ?? []).map(async (s) => {
      const { data } = await adminClient.auth.admin.getUserById(s.id);
      if (data.user?.email) emailById.set(s.id, data.user.email);
    })
  );

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Équipe commerciale
      </h2>
      <div className="mb-3">
        <CreateSalesRepForm />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-ink-900/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-kino-50/60 text-xs font-bold uppercase tracking-widest text-ink-400 dark:bg-ink-900">
            <tr>
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Membre depuis</th>
              <th className="p-3">Salons assignés</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-900/8 dark:divide-paper/8">
            {(salesReps ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-ink-400">
                  Aucun commercial pour l&apos;instant.
                </td>
              </tr>
            )}
            {(salesReps ?? []).map((s) => (
              <tr key={s.id}>
                <td className="p-3 font-medium text-ink-900 dark:text-paper">
                  {s.full_name ?? "Sans nom"}
                </td>
                <td className="p-3 text-ink-400">
                  {emailById.get(s.id) ?? "—"}
                </td>
                <td className="p-3 text-ink-400">
                  {formatMemberSince(s.created_at)}
                </td>
                <td className="p-3 text-ink-400">
                  {assignedCountByProfile.get(s.id) ?? 0}
                </td>
                <td className="p-3">
                  <form action={deleteSalesRep}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmDeleteButton label="Retirer l'accès" />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
