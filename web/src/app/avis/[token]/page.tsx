import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

type ReviewLinkStatus = {
  business_name: string;
  status: string;
  already_reviewed: boolean;
};

export default async function ReviewLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // p_token est un uuid côté base : un jeton malformé (lien tronqué,
  // copié-collé abîmé) renvoie une erreur PostgREST plutôt qu'une ligne
  // vide — traité ici exactement comme "lien invalide".
  const { data, error } = await supabase
    .rpc("get_review_link_status", { p_token: token })
    .maybeSingle();

  const status = !error ? (data as ReviewLinkStatus | null) : null;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      {!status && (
        <p className="text-center text-sm text-ink-400">
          Ce lien n&apos;est plus valide.
        </p>
      )}

      {status && status.status !== "termine" && (
        <p className="text-center text-sm text-ink-400">
          Cette réservation chez <strong>{status.business_name}</strong>{" "}
          n&apos;a pas encore été clôturée par l&apos;établissement. Merci de
          réessayer une fois le service terminé.
        </p>
      )}

      {status && status.status === "termine" && status.already_reviewed && (
        <p className="text-center text-sm text-ink-400">
          Vous avez déjà laissé un avis pour cette visite chez{" "}
          <strong>{status.business_name}</strong>. Merci !
        </p>
      )}

      {status && status.status === "termine" && !status.already_reviewed && (
        <>
          <h1 className="mb-1 text-center font-serif text-2xl text-ink-900 dark:text-paper">
            {status.business_name}
          </h1>
          <p className="mb-6 text-center text-sm text-ink-400">
            Merci de nous avoir fait confiance ! Votre avis aide les autres
            clients.
          </p>
          <ReviewForm token={token} />
        </>
      )}
    </div>
  );
}
