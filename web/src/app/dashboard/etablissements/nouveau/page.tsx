import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/dal";
import { NewBusinessForm } from "./new-business-form";

export default async function NewBusinessPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "owner") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Action réservée aux gérants.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <h1 className="mb-1 font-serif text-2xl text-ink-900 dark:text-paper">
        Ajouter un établissement
      </h1>
      <p className="mb-6 text-sm text-ink-400">
        Vous restez connecté avec le même compte — vous pourrez basculer
        entre vos établissements depuis le tableau de bord. Ce nouvel
        établissement sera visible des clients après validation manuelle
        par l&apos;équipe KinoBooking.
      </p>

      <NewBusinessForm />
    </div>
  );
}
