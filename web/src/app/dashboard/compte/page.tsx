import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import { ChangePasswordForm } from "./change-password-form";

/**
 * Page "Mon compte" — volontairement accessible à N'IMPORTE QUEL compte
 * connecté (gérant, personnel, commercial, platform_admin), sans exiger
 * de business_id : indispensable pour qu'un commercial ou un
 * platform_admin puisse aussi changer son mot de passe temporaire, alors
 * qu'ils n'ont pas forcément de salon actif. Le changement d'EMAIL reste
 * réservé à /admin (platform_admin), voir dashboard/compte/actions.ts.
 */
export default async function ComptePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour
      </Link>

      <h1 className="mb-1 font-serif text-2xl text-ink-900 dark:text-paper">
        Mon compte
      </h1>
      <p className="mb-6 text-sm text-ink-400">{user.email}</p>

      <ChangePasswordForm />

      <p className="mt-4 text-xs text-ink-400">
        Pour changer votre adresse email, contactez KinoBooking.
      </p>

      <form action={logout} className="mt-6 border-t border-ink-900/10 pt-6 dark:border-paper/10">
        <button
          type="submit"
          className="rounded-xl border border-ink-900/16 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
