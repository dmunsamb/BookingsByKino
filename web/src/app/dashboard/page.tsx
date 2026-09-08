import Link from "next/link";
import type { Profile } from "@/lib/auth/dal";
import { getCurrentProfile } from "@/lib/auth/dal";
import { logout } from "./actions";

const roleLabels: Record<Profile["role"], string> = {
  owner: "Gérant / Propriétaire",
  staff: "Personnel",
  platform_admin: "Administrateur KinoBooking",
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
        <div>
          <p className="mb-2 font-bold text-slate-900 dark:text-white">
            Compte non configuré
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Votre compte existe mais n&apos;est lié à aucun profil
            KinoBooking. Contactez l&apos;administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Bonjour, {profile.full_name ?? "utilisateur"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {roleLabels[profile.role] ?? profile.role}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/agenda"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="font-bold text-slate-900 dark:text-white">
            Horaires et capacité
          </span>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Configurer l&apos;agenda central de votre établissement.
          </p>
        </Link>
        <Link
          href="/dashboard/catalogue"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="font-bold text-slate-900 dark:text-white">
            Catalogue &amp; tarifs
          </span>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Gérer les services proposés aux clients.
          </p>
        </Link>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900 sm:col-span-2">
          Aanvragen et le reste du tableau de bord restent à construire —
          voir docs/functioneel-ontwerp-kinobooking.md, section 12.
        </div>
      </div>
    </div>
  );
}
