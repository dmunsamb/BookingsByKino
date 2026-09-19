import Link from "next/link";
import { FaqAccordion } from "@/components/faq-accordion";

/**
 * FAQ pour les visiteurs / clients — affichée dans le menu du header
 * quand personne n'est connecté. Voir /faq-gerants pour la FAQ
 * professionnelle, affichée une fois connecté (seuls les gérants et
 * leur personnel ont un compte sur KinoBooking, jamais les clients).
 */
const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Dois-je créer un compte pour réserver ?",
    answer:
      "Non. Vous réservez directement depuis la fiche de l'établissement, sans compte ni mot de passe : juste votre nom et votre numéro de téléphone.",
  },
  {
    question: "Comment réserver un rendez-vous ?",
    answer:
      "Choisissez un établissement, puis un service, puis un créneau disponible, et envoyez votre demande. L'établissement la valide ensuite et vous contacte sur WhatsApp.",
  },
  {
    question: "Que se passe-t-il après ma demande de réservation ?",
    answer:
      "Une fois votre demande validée par l'établissement, vous recevez un message WhatsApp avec le montant de l'acompte à envoyer et les coordonnées mobile money pour le faire.",
  },
  {
    question: "Dois-je payer un acompte ? Comment ?",
    answer:
      "Oui, pour une réservation avec rendez-vous : un acompte par mobile money (M-Pesa, Orange Money ou Airtel Money selon l'établissement) confirme votre créneau. Le mode « Sans rendez-vous » n'en demande pas.",
  },
  {
    question: "Puis-je venir sans rendez-vous ?",
    answer:
      "Oui, la plupart des établissements proposent un mode « Sans rendez-vous » : vous prenez un ticket dans une file d'attente et patientez sur place, sans acompte à payer.",
  },
  {
    question: "Puis-je réserver pour aujourd'hui même ?",
    answer:
      "Pas avec un rendez-vous — les créneaux s'ouvrent à partir du lendemain. Pour le jour même, présentez-vous directement en mode « Sans rendez-vous ».",
  },
  {
    question: "Comment savoir si ma réservation est confirmée ?",
    answer:
      "L'établissement vous contacte sur WhatsApp dès réception de votre acompte. Gardez votre numéro de suivi (affiché après votre demande) au cas où vous auriez besoin de les recontacter.",
  },
  {
    question: "Puis-je annuler ou changer l'horaire de ma réservation ?",
    answer:
      "Contactez directement l'établissement sur WhatsApp avec votre numéro de suivi — c'est lui qui gère votre réservation, KinoBooking n'intervient pas dans cet échange.",
  },
  {
    question: "Mon numéro de téléphone est-il visible par tout le monde ?",
    answer:
      "Non. Seul l'établissement auprès duquel vous réservez a accès à vos coordonnées, pour vous contacter au sujet de cette réservation.",
  },
  {
    question: "Comment trouver un établissement près de chez moi ?",
    answer:
      "Sur la page d'accueil, utilisez la recherche par nom, le filtre par commune, ou le menu de catégories (salon de coiffure, salon de beauté, restaurant...).",
  },
  {
    question: "Que faire si un établissement ne répond pas ?",
    answer:
      "Recontactez-le directement sur WhatsApp. KinoBooking met en relation clients et établissements mais ne gère pas les rendez-vous à leur place.",
  },
  {
    question: "Est-ce gratuit pour moi ?",
    answer:
      "Oui, entièrement gratuit pour les clients. Ce sont les établissements qui s'abonnent à KinoBooking, pas vous.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ink-900 dark:text-paper">
        Questions fréquentes
      </h1>
      <p className="mb-6 text-sm text-ink-400">
        Tout ce qu&apos;on se demande le plus souvent avant de réserver sur
        KinoBooking.
      </p>

      <FaqAccordion items={FAQ_ITEMS} />

      <p className="mt-8 text-center text-xs text-ink-400">
        Vous gérez un établissement ?{" "}
        <Link
          href="/faq-gerants"
          className="font-bold text-kino-600 hover:underline dark:text-kino-300"
        >
          Consultez la FAQ gérants
        </Link>{" "}
        ou{" "}
        <Link
          href="/inscription"
          className="font-bold text-kino-600 hover:underline dark:text-kino-300"
        >
          créez votre compte
        </Link>
        .
      </p>
    </div>
  );
}
