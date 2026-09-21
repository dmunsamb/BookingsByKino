import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
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
    </div>
  );
}
