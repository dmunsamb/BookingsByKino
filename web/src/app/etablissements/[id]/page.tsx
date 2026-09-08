import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  generateSlotsForDate,
  minBookableDateIso,
  type AvailabilityRule,
  type SlotCapacity,
} from "@/lib/availability";
import { BookingForm } from "./booking-form";
import { formatBookingReference } from "@/lib/booking-reference";
import { getSubscriptionStatus } from "@/lib/subscription";

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    date?: string;
    service?: string;
    confirmed?: string;
    ref?: string;
  }>;
}) {
  const { id } = await params;
  const {
    date: dateParam,
    service: serviceIdParam,
    confirmed,
    ref,
  } = await searchParams;
  const minDate = minBookableDateIso();
  // Jamais le jour même : une date passée/aujourd'hui envoyée via l'URL
  // (lien partagé, retour en arrière du navigateur...) est ramenée au
  // premier jour réservable plutôt que de proposer des créneaux invalides.
  const date =
    dateParam && dateParam >= minDate ? dateParam : minDate;

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, sub_category, city, address, subscription_paid_until"
    )
    .eq("id", id)
    .maybeSingle();

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-500">
        Cet établissement n&apos;existe pas ou plus.
      </div>
    );
  }

  // Un établissement inactif (abonnement KinoBooking non régularisé)
  // reste listé dans le catalogue mais sa fiche ne montre plus ses
  // coordonnées ni la réservation — seul le gérant, via son dashboard,
  // voit le vrai statut de son compte.
  const isInactive =
    getSubscriptionStatus(business.subscription_paid_until) === "inactif";

  const { data: services } = isInactive
    ? { data: [] }
    : await supabase
        .from("services")
        .select(
          "id, name, category, description, duration_minutes, price_usd, deposit_usd"
        )
        .eq("business_id", id)
        .order("created_at");

  const selectedService = serviceIdParam
    ? services?.find((s) => s.id === serviceIdParam)
    : undefined;

  let bookingSection: ReactNode = null;

  if (isInactive) {
    bookingSection = (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-bold">Établissement temporairement indisponible</p>
        <p className="mt-1">
          Cet établissement est en attente d&apos;activation et ne peut pas
          accepter de nouvelles réservations pour le moment. Merci de
          réessayer plus tard.
        </p>
      </div>
    );
  } else if (!selectedService) {
    bookingSection = (
      <>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {business.main_category === "horeca"
            ? "Tables et espaces"
            : "Nos prestations"}
        </h2>
        {(!services || services.length === 0) && (
          <p className="text-sm text-slate-400">
            Aucun service au catalogue pour l&apos;instant.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {services?.map((s) => (
            <Link
              key={s.id}
              href={`/etablissements/${id}?service=${s.id}`}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  {s.category && (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {s.category}
                    </span>
                  )}
                  <span className="whitespace-nowrap text-xs font-bold text-slate-400">
                    {s.duration_minutes} min
                  </span>
                </div>
                <h3 className="mb-1 text-sm font-extrabold text-slate-900 dark:text-white">
                  {s.name}
                </h3>
                {s.description && (
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {s.description}
                  </p>
                )}
              </div>
              <span className="text-sm font-extrabold text-kino-600">
                ${s.price_usd.toFixed(2)}
              </span>
            </Link>
          ))}
        </div>
      </>
    );
  } else {
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
      (capacities ?? []) as SlotCapacity[],
      selectedService.duration_minutes
    );

    bookingSection = (
      <BookingForm
        businessId={id}
        mainCategory={business.main_category}
        service={selectedService}
        date={date}
        minDate={minDate}
        slots={slots}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={selectedService ? `/etablissements/${id}` : "/"}
        className="mb-4 inline-block text-xs font-bold text-slate-500 hover:underline dark:text-slate-400"
      >
        ← {selectedService ? "Retour aux prestations" : "Retour à la recherche"}
      </Link>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {business.name}
      </h1>
      {!isInactive && (business.address || business.city) && (
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {[business.address, business.city].filter(Boolean).join(", ")}
        </p>
      )}
      {isInactive && <div className="mb-4" />}

      {confirmed && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <p className="font-bold">
            Demande envoyée avec succès ! L&apos;établissement va valider la
            disponibilité.
          </p>
          {ref && !Number.isNaN(Number(ref)) && (
            <>
              <p className="mt-3 text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Votre numéro de suivi
              </p>
              <p className="text-2xl font-extrabold tracking-wide">
                {formatBookingReference(Number(ref))}
              </p>
              <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                Faites-en une capture d&apos;écran : ce numéro vous permet de
                suivre votre demande auprès de l&apos;établissement en cas de
                question.
              </p>
            </>
          )}
        </div>
      )}

      {bookingSection}
    </div>
  );
}
