import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { DashboardNav } from "../dashboard-nav";
import { deleteReview } from "./actions";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm font-bold text-kino-600 dark:text-kino-300">
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export default async function AvisPage() {
  const profile = await getCurrentProfile();

  if (!profile?.business_id || !canManageBusiness(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Accès réservé au gérant de l&apos;établissement.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("business_reviews")
    .select("id, client_name, rating, comment, created_at")
    .eq("business_id", profile.business_id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <DashboardNav />

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        Avis clients
      </h1>

      <p className="mb-6 text-sm text-ink-400">
        Publiés automatiquement dès qu&apos;un client vérifié en laisse un —
        vous pouvez retirer un avis abusif ici.
      </p>

      <div className="space-y-3">
        {(reviews ?? []).length === 0 && (
          <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Aucun avis pour l&apos;instant.
          </p>
        )}
        {(reviews ?? []).map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-ink-900/10 bg-white p-4 dark:border-paper/10 dark:bg-ink-800"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-bold text-ink-900 dark:text-paper">
                {r.client_name || "Client"}
              </span>
              <Stars rating={r.rating} />
            </div>
            {r.comment && (
              <p className="mb-3 text-sm leading-relaxed text-ink-400">
                {r.comment}
              </p>
            )}
            <p className="mb-3 text-xs text-ink-400">
              {new Date(r.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            <form action={deleteReview}>
              <input type="hidden" name="id" value={r.id} />
              <ConfirmDeleteButton label="Retirer cet avis" />
            </form>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/configuration"
        className="mt-6 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à la configuration
      </Link>
    </div>
  );
}
