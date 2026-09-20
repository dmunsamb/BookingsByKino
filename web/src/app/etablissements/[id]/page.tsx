import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  generateSlotsForDate,
  firstAvailableDateIso,
  minBookableDateIso,
  type AvailabilityRule,
  type SlotCapacity,
  type BlockedStaffSlot,
} from "@/lib/availability";
import { BookingForm } from "./booking-form";
import { PhotoGallery } from "./photo-gallery";
import { formatBookingReference } from "@/lib/booking-reference";
import { getSubscriptionStatus } from "@/lib/subscription";
import { formatCdf } from "@/lib/currency";

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
  const { date: dateParam, service: serviceIdParam, confirmed, ref } =
    await searchParams;
  const minDate = minBookableDateIso();
  // Une date explicitement choisie par la cliente (navigation dans le
  // sélecteur) est toujours respectée telle quelle, même si elle s'avère
  // complète — sinon, jamais le jour même : une date passée/aujourd'hui
  // envoyée via l'URL (lien partagé, retour en arrière du navigateur...)
  // n'est pas un vrai choix, donc traitée comme une absence de choix.
  const hasExplicitDate = !!dateParam && dateParam >= minDate;
  const date = hasExplicitDate ? (dateParam as string) : minDate;

  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, city, commune, address, subscription_paid_until"
    )
    .eq("id", id)
    .maybeSingle();

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-ink-400">
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
          "id, name, category, description, duration_minutes, price_usd, deposit_usd, photo_url"
        )
        .eq("business_id", id)
        .order("created_at");

  const { data: photos } = isInactive
    ? { data: [] }
    : await supabase
        .from("business_photos")
        .select("id, url")
        .eq("business_id", id)
        .order("position");

  const selectedService = serviceIdParam
    ? services?.find((s) => s.id === serviceIdParam)
    : undefined;

  let bookingSection: ReactNode = null;

  if (isInactive) {
    bookingSection = (
      <div className="rounded-xl border border-kino-200 bg-kino-50 p-6 text-center text-sm text-ink-900 dark:border-kino-800 dark:bg-ink-800 dark:text-paper">
        <p className="font-bold">Établissement temporairement indisponible</p>
        <p className="mt-1 text-ink-400">
          Cet établissement est en attente d&apos;activation et ne peut pas
          accepter de nouvelles réservations pour le moment. Merci de
          réessayer plus tard.
        </p>
      </div>
    );
  } else if (!selectedService) {
    bookingSection = (
      <>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
          {business.main_category === "horeca"
            ? "Tables et espaces"
            : "Prestations"}
        </h2>
        {(!services || services.length === 0) && (
          <p className="text-sm text-ink-400">
            Aucun service au catalogue pour l&apos;instant.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {services?.map((s) => (
            <Link
              key={s.id}
              href={`/etablissements/${id}?service=${s.id}`}
              className="flex flex-col justify-between rounded-xl border border-ink-900/10 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
            >
              <div>
                <div className="mb-2 flex gap-3">
                  {s.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- URL de stockage externe
                    <img
                      src={s.photo_url}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 flex-none rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      {s.category && (
                        <span className="rounded bg-kino-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-kino-700 dark:bg-kino-900 dark:text-kino-300">
                          {s.category}
                        </span>
                      )}
                      <span className="whitespace-nowrap text-xs font-bold text-ink-400">
                        {s.duration_minutes} min
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-ink-900 dark:text-paper">
                      {s.name}
                    </h3>
                  </div>
                </div>
                {s.description && (
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-ink-400">
                    {s.description}
                  </p>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-kino-600 dark:text-kino-300">
                  ${s.price_usd.toFixed(2)}
                </span>
                <span className="text-xs text-ink-400">
                  {formatCdf(s.price_usd)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  } else {
    const [{ data: allRules }, { data: capacities }, { data: blockRows }] =
      await Promise.all([
        supabase
          .from("availability_rules")
          .select(
            "weekday, start_time, end_time, slot_duration_minutes, capacity, staff_id"
          )
          .eq("business_id", id),
        supabase.rpc("get_agenda_capacity", { p_business_id: id }),
        supabase
          .from("agenda_entries")
          .select("start_time, staff_id")
          .eq("business_id", id)
          .eq("source", "blokkering")
          .gte("start_time", new Date().toISOString()),
      ]);

    const rules = (allRules ?? []) as AvailabilityRule[];
    const bookingCapacities = (capacities ?? []) as SlotCapacity[];
    const blockedSlots = (blockRows ?? []) as BlockedStaffSlot[];

    // Sans date explicitement choisie, on pré-sélectionne la première
    // date où le service est réellement réservable plutôt que "demain"
    // à l'aveugle, qui peut très bien être complet, bloqué ou fermé.
    const effectiveDate = hasExplicitDate
      ? date
      : firstAvailableDateIso(
          rules,
          bookingCapacities,
          selectedService.duration_minutes,
          minDate,
          blockedSlots
        );

    const weekday = new Date(`${effectiveDate}T12:00:00+01:00`).getDay();

    const slots = generateSlotsForDate(
      rules.filter((r) => r.weekday === weekday),
      effectiveDate,
      bookingCapacities,
      selectedService.duration_minutes,
      blockedSlots
    );

    bookingSection = (
      <BookingForm
        businessId={id}
        mainCategory={business.main_category}
        service={selectedService}
        date={effectiveDate}
        minDate={minDate}
        slots={slots}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={selectedService ? `/etablissements/${id}` : "/"}
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← {selectedService ? "Retour aux prestations" : "Retour à la recherche"}
      </Link>

      <PhotoGallery photos={photos ?? []} />

      <h1 className="font-serif text-2xl text-ink-900 dark:text-paper">
        {business.name}
      </h1>
      {!isInactive && (business.address || business.commune || business.city) && (
        <p className="mb-6 text-sm text-ink-400">
          {[business.address, business.commune, business.city]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {isInactive && <div className="mb-4" />}

      {confirmed && (
        <div className="mb-6 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-ink-900 dark:text-paper">
          <p className="font-bold">
            Demande envoyée avec succès ! L&apos;établissement va valider la
            disponibilité.
          </p>
          {ref && !Number.isNaN(Number(ref)) && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-kino-600 dark:text-kino-300">
                Votre numéro de suivi
              </p>
              <p className="font-mono text-2xl font-bold tracking-wide text-ink-900 dark:text-paper">
                {formatBookingReference(Number(ref))}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Faites-en une capture d&apos;écran : ce numéro vous permet de
                suivre votre demande auprès de l&apos;établissement en cas de
                question.
              </p>
            </>
          )}
        </div>
      )}

      {!isInactive && !selectedService && (
        <Link
          href={`/etablissements/${id}/file-attente`}
          className="mb-6 block rounded-xl border border-kino-200 bg-kino-50 p-4 text-sm font-bold text-ink-900 transition hover:shadow-md dark:border-kino-800 dark:bg-ink-800 dark:text-paper"
        >
          File d&apos;attente sans rendez-vous →
        </Link>
      )}

      {bookingSection}
    </div>
  );
}
