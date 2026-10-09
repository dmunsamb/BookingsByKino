import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { KinoBookingLockup } from "@/components/kino-booking-logo";
import { FaqAccordion } from "@/components/faq-accordion";
import { ContactForm } from "./contact-form";
import { formatCdf } from "@/lib/currency";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/**
 * Sales page destinée aux prospects (gérants de salon pas encore
 * inscrits) — à distinguer de "/" qui est l'annuaire public pour les
 * clients. Vient compléter /inscription (le formulaire) et /faq-gerants
 * (déjà-inscrits) : ici on explique pourquoi s'inscrire avant d'y
 * envoyer le prospect.
 *
 * Compteur "places fondateur" : les 30 premiers établissements ayant
 * réellement payé leur abonnement gardent ce tarif de lancement à vie,
 * au-delà le tarif remonte (décision produit, pas encore chiffrée). Compté
 * sur subscription_payments (un paiement confirmé par un platform_admin
 * via recordSubscriptionPayment), pas sur le nombre d'inscriptions : une
 * simple inscription en attente de validation ne doit pas consommer une
 * place. business_id dédupliqué pour qu'un renouvellement ne compte pas
 * une deuxième fois le même établissement.
 */

const FOUNDER_SLOTS = 30;

const BENEFITS: { title: string; description: string }[] = [
  {
    title: "Zéro appel manqué",
    description:
      "Vos clients réservent depuis leur téléphone à toute heure, même quand le salon est fermé. Plus besoin de décrocher pour prendre un rendez-vous.",
  },
  {
    title: "Acompte sécurisé, sans y penser",
    description:
      "Dès qu'une demande est validée, WhatsApp s'ouvre avec un message prérempli qui indique vos coordonnées mobile money (M-Pesa, Orange Money, Airtel Money). Fini les rendez-vous fantômes.",
  },
  {
    title: "File d'attente pour le sans rendez-vous",
    description:
      "Les clients de passage prennent un ticket. Pas de créneau à bloquer, pas d'acompte à verser : votre salon reste ouvert aux deux façons de venir.",
  },
  {
    title: "Votre équipe, pas que vous",
    description:
      "Créez des comptes pour vos coiffeurs et coiffeuses, assignez-les aux réservations, sans jamais partager votre mot de passe de gérant.",
  },
  {
    title: "Vos chiffres, en clair",
    description:
      "Encaissements, meilleures ventes, taux d'absence : votre rapport par semaine, par mois ou par trimestre, exportable en CSV. Ce que vous gardiez de tête jusque-là, enfin écrit noir sur blanc.",
  },
  {
    title: "Une fiche qui donne envie",
    description:
      "Photos, horaires, avis clients et services réunis en un seul lien à partager sur WhatsApp ou vos réseaux. Votre vitrine, sans une ligne de code à écrire.",
  },
  {
    title: "Alertes email, incluses",
    description:
      "Recevez un email dès qu'une nouvelle demande de réservation arrive, sans rafraîchir votre tableau de bord toutes les cinq minutes. Gratuit, inclus dans l'abonnement, activable ou désactivable à tout moment.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Créez votre compte",
    description: "Gratuit, sans engagement, en moins de 5 minutes.",
  },
  {
    number: "2",
    title: "Votre fiche est validée",
    description:
      "L'équipe KinoBooking vérifie chaque nouvel établissement avant sa mise en ligne publique.",
  },
  {
    number: "3",
    title: "Vous recevez vos premières demandes",
    description:
      "Dès que votre fiche est en ligne, vos clients peuvent réserver. Vous validez chaque demande dans les 2 heures.",
  },
];

const FAQ_TEASER: { question: string; answer: string }[] = [
  {
    question: "C'est gratuit de s'inscrire ?",
    answer:
      "Oui, créer votre compte et votre fiche établissement est gratuit. L'abonnement ne s'applique qu'une fois votre établissement validé et en ligne.",
  },
  {
    question: "Combien de temps avant que ma fiche soit en ligne ?",
    answer:
      "L'équipe KinoBooking valide chaque nouvelle inscription, généralement sous 24h.",
  },
  {
    question: "Et si je gère plusieurs salons ?",
    answer:
      "Un seul compte peut gérer plusieurs établissements. Vous basculez de l'un à l'autre depuis votre tableau de bord.",
  },
  {
    question: "Comment je suis payé ?",
    answer:
      "Directement par vos clients, via mobile money (M-Pesa, Orange Money, Airtel Money). KinoBooking ne touche jamais à cet argent : seul l'abonnement à la plateforme vous est facturé.",
  },
];

export default async function DevenirPartenairePage() {
  // subscription_payments et platform_payment_settings ne sont lisibles
  // que par platform_admin (RLS) : client admin requis ici, cette page
  // étant publique. Seules des valeurs agrégées/de configuration en
  // ressortent, jamais une ligne de paiement.
  const admin = createAdminClient();
  const [{ data: paidBusinesses }, { data: paymentSettings }] = await Promise.all([
    admin.from("subscription_payments").select("business_id"),
    admin
      .from("platform_payment_settings")
      .select("contact_whatsapp")
      .eq("id", true)
      .maybeSingle(),
  ]);

  const foundersTaken = new Set((paidBusinesses ?? []).map((p) => p.business_id))
    .size;
  const slotsLeft = Math.max(0, FOUNDER_SLOTS - foundersTaken);
  const contactWhatsapp = paymentSettings?.contact_whatsapp || null;

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="bg-ink-900 px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <KinoBookingLockup size={36} onDark />
          </div>
          <h1 className="font-serif text-3xl leading-tight text-paper sm:text-4xl">
            Remplissez votre salon, sans lever le téléphone
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-paper/70 sm:text-base">
            KinoBooking s&apos;occupe des réservations, des acomptes et de
            la file d&apos;attente. À vous de vous occuper de vos clients.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/inscription"
              className="w-full rounded-xl bg-kino-400 px-6 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500 sm:w-auto"
            >
              Devenir partenaire fondateur
            </Link>
            <a
              href="#tarifs"
              className="w-full rounded-xl border border-paper/20 px-6 py-3.5 text-sm font-bold text-paper transition hover:bg-paper/10 sm:w-auto"
            >
              Voir le tarif
            </a>
          </div>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="mb-8 text-center font-serif text-2xl text-ink-900 dark:text-paper">
          Ce que KinoBooking change dans votre quotidien
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-ink-900/10 bg-white p-5 dark:border-paper/10 dark:bg-ink-800"
            >
              <h3 className="mb-1.5 text-sm font-bold text-ink-900 dark:text-paper">
                {b.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink-400">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-kino-100/40 px-4 py-14 dark:bg-ink-800">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center font-serif text-2xl text-ink-900 dark:text-paper">
            Comment ça marche
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.number} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kino-400 text-sm font-bold text-ink-900">
                  {s.number}
                </div>
                <h3 className="mb-1 text-sm font-bold text-ink-900 dark:text-paper">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-400">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="mx-auto max-w-2xl px-4 py-14">
        <h2 className="mb-2 text-center font-serif text-2xl text-ink-900 dark:text-paper">
          Un tarif simple, verrouillé pour les premiers
        </h2>
        <p className="mb-8 text-center text-sm text-ink-400">
          Plan Standard. Tout est inclus, aucune fonctionnalité en plus à
          payer.
        </p>

        <div className="rounded-2xl border-2 border-kino-400 bg-white p-6 shadow-sm dark:bg-ink-800">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="rounded-full bg-kino-400 px-3 py-1 text-xs font-bold text-ink-900">
              Tarif fondateur
            </span>
            <span className="text-xs font-bold text-ink-400">
              {slotsLeft > 0
                ? `Il reste ${slotsLeft} place${slotsLeft > 1 ? "s" : ""} sur ${FOUNDER_SLOTS}`
                : `Les ${FOUNDER_SLOTS} places fondateur sont prises`}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-900/10 p-4 text-center dark:border-paper/10">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                1 mois
              </p>
              <p className="mt-1 font-serif text-2xl text-ink-900 dark:text-paper">
                $9
              </p>
              <p className="text-xs text-ink-400">{formatCdf(9)}</p>
            </div>
            <div className="rounded-xl border border-kino-400 bg-kino-100/40 p-4 text-center dark:bg-kino-900/20">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                3 mois
              </p>
              <p className="mt-1 font-serif text-2xl text-ink-900 dark:text-paper">
                $24
              </p>
              <p className="text-xs text-ink-400">{formatCdf(24)}</p>
            </div>
            <div className="rounded-xl border border-ink-900/10 p-4 text-center dark:border-paper/10">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                12 mois
              </p>
              <p className="mt-1 font-serif text-2xl text-ink-900 dark:text-paper">
                $90
              </p>
              <p className="text-xs text-ink-400">{formatCdf(90)}</p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-ink-400">
            {slotsLeft > 0
              ? "Ce tarif reste le vôtre à vie, même quand il augmentera pour les suivants."
              : "Le tarif de lancement est encore actif pour une durée limitée."}
          </p>

          <Link
            href="/inscription"
            className="mt-6 block w-full rounded-xl bg-kino-400 py-3.5 text-center text-sm font-bold text-ink-900 transition hover:bg-kino-500"
          >
            Créer mon compte gratuitement
          </Link>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="mx-auto max-w-2xl px-4 py-14">
        <h2 className="mb-6 text-center font-serif text-2xl text-ink-900 dark:text-paper">
          Questions fréquentes
        </h2>
        <FaqAccordion items={FAQ_TEASER} />
        <p className="mt-6 text-center text-xs text-ink-400">
          <Link
            href="/faq-gerants"
            className="font-bold text-kino-600 hover:underline dark:text-kino-300"
          >
            Voir toutes les questions gérants →
          </Link>
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-md px-4 py-14">
        <h2 className="mb-2 text-center font-serif text-2xl text-ink-900 dark:text-paper">
          Une question avant de vous lancer ?
        </h2>
        <p className="mb-8 text-center text-sm text-ink-400">
          Écrivez-nous, on vous répond directement.
        </p>
        <ContactForm />

        {contactWhatsapp && (
          <>
            <p className="my-6 text-center text-xs font-bold uppercase tracking-widest text-ink-400">
              ou
            </p>
            <a
              href={buildWhatsAppLink(
                contactWhatsapp,
                "Bonjour, j'ai une question sur KinoBooking avant de m'inscrire."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-900/16 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-ink-900/5 dark:border-paper/16 dark:text-paper dark:hover:bg-paper/5"
            >
              Nous écrire directement sur WhatsApp
            </a>
          </>
        )}
      </section>

      {/* CTA final */}
      <section className="bg-ink-900 px-4 py-14 text-center">
        <h2 className="font-serif text-2xl text-paper">
          Prêt à remplir votre agenda ?
        </h2>
        <Link
          href="/inscription"
          className="mt-6 inline-block rounded-xl bg-kino-400 px-8 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-kino-500"
        >
          Devenir partenaire fondateur
        </Link>
      </section>
    </div>
  );
}
