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
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
        Aucun établissement n&apos;est encore associé à votre compte.
      </div>
    );
  }

  if (!isStaffMember(profile)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-ink-400">
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

  const { data: staff } = await supabase
    .from("staff_members")
    .select("id, name")
    .eq("business_id", profile.business_id)
    .eq("active", true)
    .order("name");

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
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← {selectedService ? "Changer de prestation" : "Retour au tableau de bord"}
      </Link>

      <h1 className="text-xl font-bold text-ink-900 dark:text-paper">
        Nouvelle réservation
      </h1>
      <p className="mb-6 text-sm text-ink-400">
        Pour un rendez-vous pris par téléphone ou en personne — confirmée
        immédiatement, sans étape de validation.
      </p>

      {!selectedService ? (
        <>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
            Choisir la prestation
          </h2>
          {(!services || services.length === 0) && (
            <p className="text-sm text-ink-400">
              Aucun service au catalogue pour l&apos;instant — ajoutez-en un
              dans le catalogue d&apos;abord.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {services?.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/reservations/new?service=${s.id}`}
                className="flex flex-col justify-between rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
              >
                <h3 className="mb-2 text-sm font-bold text-ink-900 dark:text-paper">
                  {s.name}
                </h3>
                <span className="text-sm font-bold text-kino-600">
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
          staff={staff ?? []}
        />
      )}
    </div>
  );
}
