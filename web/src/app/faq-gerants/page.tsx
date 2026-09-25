import Link from "next/link";
import { FaqAccordion } from "@/components/faq-accordion";

/**
 * FAQ pour les gérants (prospects et déjà inscrits) — affichée dans le
 * menu du header une fois connecté. Voir /faq pour la FAQ visiteurs
 * (clients), affichée quand personne n'est connecté.
 */
const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Comment mon établissement devient-il visible sur KinoBooking ?",
    answer:
      "Après votre inscription, l'établissement reste « en attente de validation » et n'apparaît pas encore dans le catalogue public. L'équipe KinoBooking valide manuellement chaque nouvelle inscription ; vous recevez un accès complet dès que c'est fait.",
  },
  {
    question: "Comment fonctionne l'abonnement KinoBooking ?",
    answer:
      "L'abonnement se règle par mobile money, pour 1, 3 ou 12 mois selon la durée choisie (tarif fixé par KinoBooking). Passé la date d'échéance, vous disposez d'un délai de grâce de 7 jours avant que l'accès à votre tableau de bord ne soit suspendu — les demandes de réservation de vos clients continuent d'arriver pendant ce temps.",
  },
  {
    question: "Comment un client réserve-t-il un rendez-vous ?",
    answer:
      "Depuis la fiche de votre établissement, sans créer de compte : il choisit un service puis un créneau (jamais le jour même) et envoie sa demande. Vous la validez depuis votre tableau de bord, ce qui ouvre WhatsApp avec un message prérempli demandant l'acompte au client.",
  },
  {
    question: "Ai-je un délai pour répondre à une demande de réservation ?",
    answer:
      "Oui : par engagement envers vos clients, toute nouvelle demande de réservation doit être validée ou refusée dans un délai de 2 heures pendant vos heures d'ouverture (voir les CGV, article 3). Pensez à surveiller votre tableau de bord ou vos notifications.",
  },
  {
    question: "Puis-je accepter des clients sans rendez-vous ?",
    answer:
      "Oui, avec le mode « Sans rendez-vous » : le client prend un ticket dans une file d'attente, sans acompte à payer, et sans le délai imposé aux réservations avec rendez-vous.",
  },
  {
    question: "Comment recevoir l'acompte de mes clients ?",
    answer:
      "Renseignez vos numéros mobile money (M-Pesa, Orange Money, Airtel Money) dans Configuration → coordonnées de paiement. Ils sont ensuite inclus automatiquement dans le message WhatsApp envoyé au client lors de la validation de sa demande.",
  },
  {
    question: "Puis-je gérer plusieurs salons avec un seul compte ?",
    answer:
      "Oui. Depuis Configuration → « Ajouter un établissement », créez un deuxième salon rattaché au même compte de connexion, puis basculez de l'un à l'autre depuis le tableau de bord.",
  },
  {
    question: "Comment ajouter les membres de mon équipe ?",
    answer:
      "Depuis Configuration → Équipe. Une fois ajoutés, ils deviennent assignables à une réservation (« avec untel/unetelle »). Vous pouvez aussi leur donner un accès à leur propre compte (téléphone + mot de passe, sans email requis), avec le rôle Coiffeur/Coiffeuse ou Gérant.",
  },
  {
    question: "Comment bloquer un créneau (congé, indisponibilité) ?",
    answer:
      "Depuis Configuration → Horaires et capacité, ajoutez un blocage sur la date et la plage horaire concernées : le créneau disparaît immédiatement de la disponibilité proposée aux clients.",
  },
  {
    question: "Que se passe-t-il si un client ne se présente pas ?",
    answer:
      "Une fois l'heure du rendez-vous passée, marquez-le « No-show » depuis votre tableau de bord. Le taux d'absences de la semaine est visible dans Rapport, avec une recommandation concrète pour le réduire (ex. demander un acompte sur les prestations qui n'en ont pas encore).",
  },
  {
    question: "Où voir mes encaissements et mes statistiques ?",
    answer:
      "Dans Rapport : un bilan de la semaine (encaissements, meilleures ventes, absences) et un rapport par période (semaine, mois, trimestre, année), téléchargeable en CSV.",
  },
  {
    question: "Comment ajouter des photos de mon salon ?",
    answer:
      "Depuis Configuration → Photos, ajoutez jusqu'à 8 photos qui défilent sur votre fiche établissement. Vous pouvez aussi ajouter une photo par service (catalogue) et par membre de l'équipe. Formats acceptés : JPEG, PNG, WebP, 5 Mo maximum par photo.",
  },
  {
    question: "Le numéro de téléphone d'un client est-il visible par tout mon personnel ?",
    answer:
      "Non. Seul le gérant (propriétaire) voit le numéro complet ; un simple membre du personnel voit une version masquée, pour protéger la confidentialité de vos clients.",
  },
];

export default function FaqGerantsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour au tableau de bord
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ink-900 dark:text-paper">
        Questions fréquentes — Gérants
      </h1>
      <p className="mb-6 text-sm text-ink-400">
        Tout ce qu&apos;un gérant ou son équipe se demande le plus souvent
        sur KinoBooking.
      </p>

      <FaqAccordion items={FAQ_ITEMS} />

      <p className="mt-8 text-center text-xs text-ink-400">
        Une autre question ? Contactez l&apos;équipe KinoBooking depuis
        votre tableau de bord.
      </p>
    </div>
  );
}
