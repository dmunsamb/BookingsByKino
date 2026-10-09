import Link from "next/link";

/**
 * Politique de confidentialité — couvre les données personnelles (clients,
 * gérants, visiteurs) et les cookies (nécessaires + mesure d'audience
 * soumise à consentement, voir cookie-consent.tsx). Complète les CGV
 * (conditions-generales/page.tsx), qui se limitent au contrat de
 * réservation entre client et établissement.
 */
export default function PolitiqueDeConfidentialitePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/"
        className="mb-4 inline-block text-xs font-bold text-ink-400 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ink-900 dark:text-paper">
        Politique de confidentialité
      </h1>
      <p className="mb-8 text-sm text-ink-400">
        Comment KinoBooking collecte, utilise et protège vos données
        personnelles.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-ink-900 dark:text-paper">
        <section>
          <h2 className="mb-2 font-bold">1. Qui est responsable de vos données</h2>
          <p>
            KinoBooking (kinshasa.io) est responsable du traitement des
            données collectées sur ce site. Pour toute question, écrivez à{" "}
            <a
              href="mailto:contact@kinobooking.app"
              className="font-bold text-kino-600 hover:underline dark:text-kino-300"
            >
              contact@kinobooking.app
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">2. Données que nous collectons</h2>
          <p className="mb-2">
            <strong>Si vous réservez un rendez-vous ou prenez un ticket</strong>{" "}
            : votre nom et votre numéro de téléphone, pour que
            l&apos;établissement puisse vous contacter au sujet de votre
            demande.
          </p>
          <p className="mb-2">
            <strong>Si vous êtes gérant ou membre d&apos;une équipe</strong> :
            votre nom, email ou numéro de téléphone, mot de passe (jamais
            stocké en clair), ainsi que les informations de votre
            établissement (nom, adresse, horaires, services, photos) et vos
            coordonnées mobile money, utilisées uniquement pour les afficher
            à vos clients.
          </p>
          <p>
            <strong>Si vous visitez simplement le site</strong> : des
            données de navigation anonymisées, uniquement si vous avez
            accepté les cookies de mesure d&apos;audience (voir section 4).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">3. Pourquoi nous utilisons ces données</h2>
          <p>
            Pour faire fonctionner les réservations et la file
            d&apos;attente, gérer les comptes gérants et leur équipe,
            afficher les fiches établissements aux clients, et comprendre
            comment le site est utilisé afin de l&apos;améliorer.
            KinoBooking n&apos;utilise jamais vos données à des fins
            publicitaires et ne les revend à personne.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">4. Cookies et mesure d&apos;audience</h2>
          <p className="mb-2">
            <strong>Cookie nécessaire</strong> : un cookie de session, posé
            dès votre connexion, sert uniquement à vous garder connecté. Il
            ne demande pas de consentement, car le site ne peut pas
            fonctionner sans lui.
          </p>
          <p>
            <strong>Cookies de mesure d&apos;audience</strong> : avec votre
            accord, nous utilisons Google Analytics pour savoir combien de
            personnes visitent le site, quelles pages elles consultent et
            d&apos;où elles viennent. Ces cookies ne sont posés
            qu&apos;après avoir cliqué sur « Accepter » dans le bandeau
            affiché à votre première visite. Vous pouvez changer d&apos;avis
            à tout moment depuis le lien « Gérer les cookies » en bas de
            chaque page.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">5. Avec qui vos données sont partagées</h2>
          <p>
            Votre nom et votre numéro de téléphone ne sont transmis
            qu&apos;à l&apos;établissement concerné par votre réservation.
            Si vous avez accepté les cookies de mesure d&apos;audience, des
            données de navigation anonymisées sont transmises à Google
            (Google Analytics). KinoBooking ne partage vos données avec
            aucune autre entreprise.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">6. Combien de temps nous les gardons</h2>
          <p>
            Les données d&apos;un compte gérant sont conservées tant que le
            compte existe. Les données d&apos;une réservation sont
            conservées le temps nécessaire au suivi de celle-ci, puis
            archivées pour les statistiques de l&apos;établissement
            concerné. Les données de mesure d&apos;audience sont conservées
            selon les règles par défaut de Google Analytics.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">7. Vos droits</h2>
          <p>
            Vous pouvez demander à consulter, corriger ou supprimer vos
            données personnelles à tout moment en écrivant à{" "}
            <a
              href="mailto:contact@kinobooking.app"
              className="font-bold text-kino-600 hover:underline dark:text-kino-300"
            >
              contact@kinobooking.app
            </a>
            . Un gérant peut aussi modifier la plupart de ses informations
            directement depuis son tableau de bord.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">8. Sécurité</h2>
          <p>
            Les mots de passe sont stockés sous forme chiffrée, jamais en
            clair. L&apos;accès aux données est limité par des règles
            techniques strictes : un membre du personnel ne voit, par
            exemple, jamais le numéro de téléphone complet d&apos;un client,
            seul le gérant y a accès. KinoBooking n&apos;a jamais accès à
            vos acomptes, versés directement à l&apos;établissement par
            mobile money.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-bold">9. Modification de cette politique</h2>
          <p>
            KinoBooking peut modifier cette politique de confidentialité à
            tout moment. La version applicable est celle affichée sur cette
            page.
          </p>
        </section>
      </div>
    </div>
  );
}
