import Link from "next/link";
import Image from "next/image";
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
import { OpeningHours, todaysHoursLabel } from "./opening-hours";
import { ReviewsSection, Stars, averageRating } from "./reviews-section";
import { formatBookingReference } from "@/lib/booking-reference";
import { getSubscriptionStatus } from "@/lib/subscription";
import { formatCdf } from "@/lib/currency";

const NAV_SECTIONS = [
  { anchor: "services", label: "Services" },
  { anchor: "horaires", label: "Horaires" },
  { anchor: "avis", label: "Avis" },
] as const;

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
      "id, name, main_category, city, commune, address, description, subscription_paid_until"
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

  const { data: businessHours } = isInactive
    ? { data: [] }
    : await supabase
        .from("business_hours")
        .select("weekday, start_time, end_time")
        .eq("business_id", id);

  const { data: reviews } = isInactive
    ? { data: [] }
    : await supabase
        .from("business_reviews")
        .select("id, client_name, rating, comment, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false });

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
              href={`/etablissements/${id}?service=${s.id}#services`}
              className="flex flex-col justify-between rounded-xl border border-ink-900/10 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-paper/10 dark:bg-ink-800"
            >
              <div>
                <div className="mb-2 flex gap-3">
                  {s.photo_url && (
                    <Image
                      src={s.photo_url}
                      alt=""
                      width={56}
                      height={56}
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

  const reviewCount = reviews?.length ?? 0;
  const hoursToday = !isInactive ? todaysHoursLabel(businessHours ?? []) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={
          selectedService ? `/etablissements/${id}#services` : "/"
        }
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← {selectedService ? "Retour aux prestations" : "Retour à la recherche"}
      </Link>

      <PhotoGallery photos={photos ?? []} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-serif text-2xl text-ink-900 dark:text-paper">
          {business.name}
        </h1>
        {!isInactive && reviewCount > 0 && (
          <a
            href="#avis"
            className="flex items-center gap-1.5 text-xs hover:underline"
          >
            <Stars rating={Math.round(averageRating(reviews ?? []))} size={14} />
            <span className="font-bold text-ink-900 dark:text-paper">
              {averageRating(reviews ?? []).toFixed(1)}
            </span>
            <span className="text-ink-400">({reviewCount} avis)</span>
          </a>
        )}
      </div>
      {!isInactive && (business.address || business.commune || business.city) && (
        <p className="mt-1 text-sm text-ink-400">
          {[business.address, business.commune, business.city]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {hoursToday && (
        <a
          href="#horaires"
          className="mt-1 inline-block text-xs font-bold text-kino-600 hover:underline dark:text-kino-300"
        >
          {hoursToday}
        </a>
      )}
      {isInactive && <div className="mb-4" />}

      {confirmed && (
        <div className="mb-6 mt-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-ink-900 dark:text-paper">
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
          <p className="mt-3 border-t border-success/20 pt-3 text-xs text-ink-400">
            L&apos;établissement s&apos;engage à répondre sous{" "}
            <strong>2 heures</strong> (pendant ses heures d&apos;ouverture).
            Passé ce délai, relancez-le directement sur WhatsApp avec votre
            numéro de suivi.
          </p>
        </div>
      )}

      {!isInactive && (
        <>
          {/* Menu d'ancres façon Setmore : liens internes (#section) vers
              plus bas sur CETTE MÊME page, plutôt que des onglets qui
              changeraient de vue — tout reste visible d'un seul chargement,
              un seul défilement. */}
          <div className="mb-6 mt-6 flex gap-2 border-b border-ink-900/10 pb-3 dark:border-paper/10">
            {NAV_SECTIONS.map((s) => (
              <a
                key={s.anchor}
                href={`#${s.anchor}`}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-ink-400 transition hover:bg-ink-900/5 dark:hover:bg-paper/10"
              >
                {s.label}
              </a>
            ))}
          </div>

          {business.description && (
            <p className="mb-6 text-sm leading-relaxed text-ink-900 dark:text-paper">
              {business.description}
            </p>
          )}

          <section id="services" className="scroll-mt-4">
            {!selectedService && (
              <Link
                href={`/etablissements/${id}/file-attente`}
                className="mb-6 block rounded-xl border border-kino-200 bg-kino-50 p-4 text-sm font-bold text-ink-900 transition hover:shadow-md dark:border-kino-800 dark:bg-ink-800 dark:text-paper"
              >
                File d&apos;attente sans rendez-vous →
              </Link>
            )}
            {bookingSection}
          </section>

          <section id="horaires" className="scroll-mt-4">
            <OpeningHours hours={businessHours ?? []} />
          </section>

          <section id="avis" className="scroll-mt-4">
            <ReviewsSection reviews={reviews ?? []} />
          </section>
        </>
      )}

      {isInactive && bookingSection}
    </div>
  );
}
