import Link from "next/link";
import { getCurrentProfile, isStaffMember } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  generateSlotsForDate,
  todayIso,
  type AvailabilityRule,
  type SlotCapacity,
} from "@/lib/availability";
import { NewBookingForm } from "./new-booking-form";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; date?: string }>;
}) {
  const { service: serviceIdParam, date: dateParam } = await searchParams;
  const profile = await getCurrentProfile();

  if (!profile?.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Aucun établissement n&apos;est encore associé à votre compte.
      </div>
    );
  }

  if (!isStaffMember(profile)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Action réservée au personnel de l&apos;établissement.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_usd")
    .eq("business_id", profile.business_id)
    .order("created_at");

  const selectedService = serviceIdParam
    ? services?.find((s) => s.id === serviceIdParam)
    : undefined;

  const date = dateParam || todayIso();

  let slots: ReturnType<typeof generateSlotsForDate> = [];

  if (selectedService) {
    const weekday = new Date(`${date}T12:00:00+01:00`).getDay();

    const { data: rules } = await supabase
      .from("availability_rules")
      .select("weekday, start_time, end_time, slot_duration_minutes, capacity")
      .eq("business_id", profile.business_id)
      .eq("weekday", weekday);

    const { data: capacities } = await supabase.rpc("get_agenda_capacity", {
      p_business_id: profile.business_id,
    });

    slots = generateSlotsForDate(
      (rules ?? []) as AvailabilityRule[],
      date,
      (capacities ?? []) as SlotCapacity[],
      selectedService.duration_minutes
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={selectedService ? "/dashboard/reservations/new" : "/dashboard"}
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← {selectedService ? "Changer de prestation" : "Retour au tableau de bord"}
      </Link>

      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        Nouvelle réservation
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Pour un rendez-vous pris par téléphone ou en personne — confirmée
        immédiatement, sans étape de validation.
      </p>

      {!selectedService ? (
        <>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Choisir la prestation
          </h2>
          {(!services || services.length === 0) && (
            <p className="text-sm text-slate-400">
              Aucun service au catalogue pour l&apos;instant — ajoutez-en un
              dans le catalogue d&apos;abord.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {services?.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/reservations/new?service=${s.id}`}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <h3 className="mb-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  {s.name}
                </h3>
                <span className="text-sm font-extrabold text-kino-600">
                  ${s.price_usd.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <NewBookingForm
          serviceId={selectedService.id}
          serviceName={selectedService.name}
          date={date}
          slots={slots}
        />
      )}
    </div>
  );
}
