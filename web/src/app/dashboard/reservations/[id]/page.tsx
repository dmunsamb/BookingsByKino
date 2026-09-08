import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  generateSlotsForDate,
  type AvailabilityRule,
  type SlotCapacity,
} from "@/lib/availability";
import { EditBookingForm } from "./edit-form";

function localDateFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Africa/Kinshasa",
  });
}

function localTimeFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Africa/Kinshasa",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EditReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ service?: string; date?: string }>;
}) {
  const { id: bookingId } = await params;
  const { service: serviceParam, date: dateParam } = await searchParams;

  const profile = await getCurrentProfile();

  if (!profile?.business_id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Aucun établissement n&apos;est encore associé à votre compte.
      </div>
    );
  }

  if (profile.role !== "owner") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Seul le gérant peut modifier manuellement une réservation.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("agenda_entries")
    .select(
      "id, business_id, service_id, start_time, end_time, client_name, client_phone"
    )
    .eq("id", bookingId)
    .eq("business_id", profile.business_id)
    .maybeSingle();

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
        Cette réservation n&apos;existe pas ou plus.
      </div>
    );
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_usd")
    .eq("business_id", profile.business_id)
    .order("created_at");

  const originalDate = localDateFromIso(booking.start_time);
  const originalServiceId = booking.service_id ?? services?.[0]?.id ?? "";
  const date = dateParam || originalDate;
  const selectedServiceId = serviceParam || originalServiceId;
  const selectedService = services?.find((s) => s.id === selectedServiceId);

  let slots: ReturnType<typeof generateSlotsForDate> = [];

  if (selectedService) {
    const weekday = new Date(`${date}T12:00:00+01:00`).getDay();

    const { data: rules } = await supabase
      .from("availability_rules")
      .select("weekday, start_time, end_time, slot_duration_minutes, capacity")
      .eq("business_id", profile.business_id)
      .eq("weekday", weekday);

    // On calcule la capacité nous-mêmes (plutôt que via get_agenda_capacity)
    // pour exclure la réservation en cours d'édition : sinon elle se
    // compterait elle-même et pourrait bloquer sa propre modification.
    const { data: existingEntries } = await supabase
      .from("agenda_entries")
      .select("start_time")
      .eq("business_id", profile.business_id)
      .neq("id", bookingId)
      .in("status", ["pending_approval", "approved_waiting_payment", "confirmed"]);

    const bookedCounts = new Map<string, number>();
    for (const entry of existingEntries ?? []) {
      bookedCounts.set(
        entry.start_time,
        (bookedCounts.get(entry.start_time) ?? 0) + 1
      );
    }
    const capacities: SlotCapacity[] = Array.from(
      bookedCounts.entries()
    ).map(([start_time, booked_count]) => ({
      start_time,
      end_time: start_time,
      booked_count,
    }));

    slots = generateSlotsForDate(
      (rules ?? []) as AvailabilityRule[],
      date,
      capacities,
      selectedService.duration_minutes
    );
  }

  const currentSlotValue =
    date === originalDate && selectedServiceId === originalServiceId
      ? `${localTimeFromIso(booking.start_time)}|${
          selectedService?.duration_minutes ?? 0
        }`
      : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Retour au tableau de bord
      </Link>

      <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
        Modifier la réservation
      </h1>

      {!services || services.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          Aucun service au catalogue pour l&apos;instant.
        </p>
      ) : (
        <EditBookingForm
          bookingId={booking.id}
          services={services}
          selectedServiceId={selectedServiceId}
          date={date}
          slots={slots}
          currentSlotValue={currentSlotValue}
          clientName={booking.client_name ?? ""}
          clientPhone={booking.client_phone ?? ""}
        />
      )}
    </div>
  );
}
