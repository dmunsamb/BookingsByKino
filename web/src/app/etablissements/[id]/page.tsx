import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  generateSlotsForDate,
  type AvailabilityRule,
  type SlotCapacity,
} from "@/lib/availability";
import { BookingForm } from "./booking-form";

function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Kinshasa",
  });
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; confirmed?: string }>;
}) {
  const { id } = await params;
  const { date: dateParam, confirmed } = await searchParams;
  const date = dateParam || todayIso();

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, main_category, sub_category, city, address")
    .eq("id", id)
    .maybeSingle();

  if (!business) {
    notFound();
  }

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, name, category, description, duration_minutes, price_usd, deposit_usd"
    )
    .eq("business_id", id)
    .order("created_at");

  // 0 = dimanche ... 6 = samedi, même convention que Date.getDay() et nos
  // availability_rules (voir docs section 6.4).
  const weekday = new Date(`${date}T12:00:00+01:00`).getDay();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("weekday, start_time, end_time, slot_duration_minutes, capacity")
    .eq("business_id", id)
    .eq("weekday", weekday);

  const { data: capacities } = await supabase.rpc("get_agenda_capacity", {
    p_business_id: id,
  });

  const slots = generateSlotsForDate(
    (rules ?? []) as AvailabilityRule[],
    date,
    (capacities ?? []) as SlotCapacity[]
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← Retour à la recherche
      </Link>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {business.name}
      </h1>
      {(business.address || business.city) && (
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {[business.address, business.city].filter(Boolean).join(", ")}
        </p>
      )}

      {confirmed && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Demande envoyée avec succès ! La zaak va valider la disponibilité.
        </div>
      )}

      <BookingForm
        businessId={business.id}
        mainCategory={business.main_category}
        services={services ?? []}
        date={date}
        slots={slots}
      />
    </div>
  );
}
