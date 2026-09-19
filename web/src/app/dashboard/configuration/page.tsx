import Link from "next/link";
import { getCurrentProfile, canManageBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { MobileMoneyForm } from "../mobile-money-form";
import { DashboardNav } from "../dashboard-nav";
import { OnlineToggle } from "./online-toggle";
import type { MobileMoneyAccount, MobileMoneyProvider } from "@/lib/whatsapp";

export default async function ConfigurationPage() {
  const profile = await getCurrentProfile();

  if (!profile?.business_id) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-ink-400">
        Aucun établissement associé à votre compte.
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: businessData }, { count: availabilityRulesCount }, { count: servicesCount }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select(
          "mpesa_number, mpesa_holder_name, orange_money_number, orange_money_holder_name, airtel_money_number, airtel_money_holder_name, is_online"
        )
        .eq("id", profile.business_id)
        .maybeSingle(),
      supabase
        .from("availability_rules")
        .select("id", { count: "exact", head: true })
        .eq("business_id", profile.business_id),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", profile.business_id),
    ]);

  const hasServices = (servicesCount ?? 0) > 0;
  const hasAvailability = (availabilityRulesCount ?? 0) > 0;

  const mobileMoneyAccounts: MobileMoneyAccount[] = (
    [
      ["mpesa", businessData?.mpesa_number, businessData?.mpesa_holder_name],
      [
        "orange_money",
        businessData?.orange_money_number,
        businessData?.orange_money_holder_name,
      ],
      [
        "airtel_money",
        businessData?.airtel_money_number,
        businessData?.airtel_money_holder_name,
      ],
    ] as [
      MobileMoneyProvider,
      string | null | undefined,
      string | null | undefined,
    ][]
  )
    .filter(([, number]) => !!number)
    .map(([provider, number, holderName]) => ({
      provider,
      number: number as string,
      holderName: holderName ?? null,
    }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <DashboardNav />

      <h1 className="mb-6 font-serif text-2xl text-ink-900 dark:text-paper">
        Configuration
      </h1>

      {canManageBusiness(profile) && (
        <OnlineToggle isOnline={businessData?.is_online ?? false} />
      )}

      {canManageBusiness(profile) && (!hasServices || !hasAvailability) && (
        <div className="mb-6 rounded-xl border border-kino-200 bg-kino-50 p-4 text-sm dark:border-kino-800 dark:bg-ink-800">
          <p className="mb-2 font-bold text-ink-900 dark:text-paper">
            À terminer avant d&apos;être visible des clients
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span className={hasServices ? "text-success" : "text-kino-500"}>
                {hasServices ? "✓" : "○"}
              </span>
              {hasServices ? (
                <span className="text-ink-400 line-through">
                  Ajouter au moins un service au catalogue
                </span>
              ) : (
                <Link
                  href="/dashboard/catalogue"
                  className="font-bold text-ink-900 hover:underline dark:text-paper"
                >
                  Ajouter au moins un service au catalogue
                </Link>
              )}
            </li>
            <li className="flex items-center gap-2">
              <span className={hasAvailability ? "text-success" : "text-kino-500"}>
                {hasAvailability ? "✓" : "○"}
              </span>
              {hasAvailability ? (
                <span className="text-ink-400 line-through">
                  Définir vos horaires et votre capacité
                </span>
              ) : (
                <Link
                  href="/dashboard/agenda"
                  className="font-bold text-ink-900 hover:underline dark:text-paper"
                >
                  Définir vos horaires et votre capacité
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {canManageBusiness(profile) && (
          <Link
            href="/dashboard/configuration/etablissement"
            className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
          >
            <span className="font-bold text-ink-900 dark:text-paper">
              Mon établissement
            </span>
            <p className="mt-1 text-ink-400">
              Nom, catégorie, adresse, commune, WhatsApp et heure
              d&apos;ouverture.
            </p>
          </Link>
        )}
        {canManageBusiness(profile) && (
          <Link
            href="/dashboard/equipe"
            className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
          >
            <span className="font-bold text-ink-900 dark:text-paper">
              Équipe
            </span>
            <p className="mt-1 text-ink-400">
              Gérer les membres de l&apos;équipe — à faire avant de définir
              leurs horaires.
            </p>
          </Link>
        )}
        <Link
          href="/dashboard/agenda"
          className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
        >
          <span className="font-bold text-ink-900 dark:text-paper">
            Horaires et capacité
          </span>
          <p className="mt-1 text-ink-400">
            Configurer l&apos;agenda central de votre établissement.
          </p>
        </Link>
        <Link
          href="/dashboard/catalogue"
          className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
        >
          <span className="font-bold text-ink-900 dark:text-paper">
            Catalogue &amp; tarifs
          </span>
          <p className="mt-1 text-ink-400">
            Gérer les services proposés aux clients.
          </p>
        </Link>
        {canManageBusiness(profile) && (
          <Link
            href="/dashboard/photos"
            className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
          >
            <span className="font-bold text-ink-900 dark:text-paper">
              Photos
            </span>
            <p className="mt-1 text-ink-400">
              La galerie visible sur votre fiche établissement.
            </p>
          </Link>
        )}
        {canManageBusiness(profile) && (
          <Link
            href="/dashboard/etablissements/nouveau"
            className="rounded-2xl border border-ink-900/10 bg-white p-6 text-sm shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
          >
            <span className="font-bold text-ink-900 dark:text-paper">
              Ajouter un établissement
            </span>
            <p className="mt-1 text-ink-400">
              Gérer plusieurs salons depuis le même compte.
            </p>
          </Link>
        )}
        {canManageBusiness(profile) && (
          <MobileMoneyForm accounts={mobileMoneyAccounts} />
        )}
      </div>
    </div>
  );
}
