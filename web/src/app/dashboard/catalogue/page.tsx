import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ServiceForm } from "./service-form";
import { deleteService } from "./actions";

export default async function CataloguePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <p className="p-8 text-sm text-slate-500 dark:text-slate-400">
        Compte non configuré.
      </p>
    );
  }

  if (!profile.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Aucun établissement n&apos;est encore associé à votre compte. Contactez
        l&apos;administrateur KinoBooking.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, category, description, duration_minutes, price_usd, deposit_usd"
    )
    .eq("business_id", profile.business_id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Retour au tableau de bord
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Catalogue &amp; tarifs
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Les services que vous ajoutez ici sont ce que les clients verront
          et pourront réserver (FR-5.1/5.2, section 4.5).
        </p>
      </div>

      {profile.role === "owner" && <ServiceForm />}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(!services || services.length === 0) && (
          <p className="col-span-full text-center text-sm text-slate-400">
            Aucun service dans le catalogue pour l&apos;instant.
          </p>
        )}
        {services?.map((service) => (
          <div
            key={service.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                {service.category && (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {service.category}
                  </span>
                )}
                <span className="whitespace-nowrap text-xs font-bold text-slate-400">
                  {service.duration_minutes} min
                </span>
              </div>
              <h3 className="mb-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {service.name}
              </h3>
              {service.description && (
                <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {service.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <div>
                <span className="block text-[10px] text-slate-400">
                  Prix total
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  ${Number(service.price_usd).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400">
                  Acompte
                </span>
                <span className="text-sm font-extrabold text-kino-600">
                  ${Number(service.deposit_usd).toFixed(2)}
                </span>
              </div>
              {profile.role === "owner" && (
                <form action={deleteService}>
                  <input type="hidden" name="id" value={service.id} />
                  <ConfirmDeleteButton />
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
