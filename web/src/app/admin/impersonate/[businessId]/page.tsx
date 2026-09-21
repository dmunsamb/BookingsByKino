import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { startImpersonationAction } from "../actions";

export default async function ImpersonateChoicePage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "platform_admin" && profile.role !== "sales")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  if (profile.role === "sales") {
    const { data: assignment } = await supabase
      .from("business_sales_reps")
      .select("business_id")
      .eq("business_id", businessId)
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!assignment) redirect("/admin");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, signup_status")
    .eq("id", businessId)
    .maybeSingle();

  // Un salon pas encore approuvé (ou refusé) n'a pas de tableau de bord
  // fonctionnel — rien d'utile à "voir en tant que" pour l'instant.
  if (
    !business ||
    (business.signup_status !== "approved" &&
      business.signup_status !== "awaiting_payment")
  ) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 font-serif text-2xl text-ink-900 dark:text-paper">
        Voir en tant que
      </h1>
      <p className="mb-1 text-sm font-bold text-ink-900 dark:text-paper">
        {business.name}
      </p>
      <p className="mb-6 text-sm text-ink-400">
        Choisissez le rôle avec lequel accéder au tableau de bord de cet
        établissement. La session se termine automatiquement au bout d&apos;1
        heure, ou en cliquant sur « Quitter ».
      </p>
      <form action={startImpersonationAction} className="flex flex-col gap-3">
        <input type="hidden" name="business_id" value={business.id} />
        <button
          type="submit"
          name="acting_role"
          value="owner"
          className="rounded-xl bg-kino-400 py-3 text-sm font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Voir en tant que gérant
        </button>
        <button
          type="submit"
          name="acting_role"
          value="staff"
          className="rounded-xl border border-ink-900/16 py-3 text-sm font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
        >
          Voir en tant que personnel
        </button>
      </form>
    </div>
  );
}
