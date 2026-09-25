import Link from "next/link";

/**
 * Conditions générales de vente — demandées explicitement pour couvrir
 * la politique d'acompte non remboursable et d'absence (no-show), lues
 * et acceptées par le client avant l'envoi d'une demande de réservation
 * avec rendez-vous (voir etablissements/[id]/booking-form.tsx). Accessible
 * aussi depuis le pied de page, comme n'importe quel site.
 */
export default function ConditionsGeneralesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ink-900 dark:text-paper">
        Conditions générales de vente
      </h1>
      <p className="mb-8 text-sm text-ink-400">
        Applicables à toute réservation avec rendez-vous effectuée sur
        KinoBooking.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-ink-900 dark:text-paper">
        <section>
          <h2 className="mb-2 font-bold">1. Objet</h2>
          <p>
            KinoBooking est une plateforme qui met en relation des clients et
            des établissements (salons de coiffure, salons de beauté,
            établissements Horeca...) à Kinshasa et Lubumbashi. KinoBooking
            facilite la prise de rendez-vous mais n&apos;est pas partie à la
            prestation rendue par l&apos;établissement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">2. Demande de réservation</h2>
          <p>
            Envoyer une demande de réservation avec rendez-vous est gratuit
            et non engageant. Elle ne devient un rendez-vous confirmé
            qu&apos;après validation par l&apos;établissement et paiement de
            l&apos;acompte demandé.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">3. Délai de réponse de l&apos;établissement</h2>
          <p>
            L&apos;établissement s&apos;engage à répondre à toute demande de
            réservation (validation ou refus) dans un délai de{" "}
            <strong>2 heures</strong>, pendant ses heures d&apos;ouverture
            déclarées. Une demande reçue en dehors de ces heures est traitée
            dès la réouverture. Il s&apos;agit d&apos;un engagement de
            moyens de l&apos;établissement envers le client ; il n&apos;engage
            pas la responsabilité de KinoBooking, simple intermédiaire
            technique entre les deux (voir article 8).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">4. Acompte</h2>
          <p>
            Une fois votre demande validée, l&apos;établissement vous
            communique le montant de l&apos;acompte et ses coordonnées
            mobile money. Cet acompte confirme votre créneau et{" "}
            <strong>reste acquis à l&apos;établissement</strong> : il
            n&apos;est pas remboursable, sauf décision contraire de
            l&apos;établissement lui-même.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">5. Annulation ou changement d&apos;horaire</h2>
          <p>
            Si vous ne pouvez pas honorer votre rendez-vous, prévenez
            directement l&apos;établissement sur WhatsApp, le plus tôt
            possible, en indiquant votre numéro de suivi. Le report ou le
            remboursement éventuel de l&apos;acompte dépend uniquement de la
            politique de l&apos;établissement concerné.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">6. Absence au rendez-vous (no-show)</h2>
          <p>
            Si vous ne vous présentez pas à votre rendez-vous sans avoir
            prévenu l&apos;établissement au préalable, l&apos;acompte payé
            est définitivement perdu.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">7. Mode « Sans rendez-vous »</h2>
          <p>
            La file d&apos;attente sans rendez-vous ne demande aucun acompte.
            Une place dans la file n&apos;est pas garantie : elle dépend de
            la disponibilité de l&apos;établissement au moment de votre
            prise en charge.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">8. Rôle de KinoBooking</h2>
          <p>
            KinoBooking met en relation clients et établissements. La
            gestion du rendez-vous, l&apos;encaissement de l&apos;acompte et
            la prestation elle-même relèvent exclusivement de
            l&apos;établissement. KinoBooking n&apos;intervient pas dans un
            litige entre un client et un établissement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">9. Données personnelles</h2>
          <p>
            Votre nom et votre numéro de téléphone ne sont transmis qu&apos;à
            l&apos;établissement concerné par votre réservation, pour vous
            contacter à ce sujet.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">10. Modification des présentes conditions</h2>
          <p>
            KinoBooking peut modifier ces conditions générales de vente à
            tout moment. La version applicable à une réservation est celle
            affichée sur ce site au moment de l&apos;envoi de la demande.
          </p>
        </section>
      </div>
    </div>
  );
}
