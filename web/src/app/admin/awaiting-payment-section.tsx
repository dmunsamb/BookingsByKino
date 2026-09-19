import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { rejectBusiness } from "./actions";
import { SubscriptionPaymentDialog } from "./subscription-payment-dialog";
import { ViewSignupDialog } from "./view-signup-dialog";
import { TestBadge } from "./test-badge";
import { fetchPriceByDuration, resolveOwnerNames } from "./signup-shared";

/**
 * Étape 2/2 du flux d'approbation (voir PendingSignupsSection pour
 * l'étape 1/2 et conditionallyApproveBusiness/migration 0030) :
 * établissements approuvés "sous conditions" mais toujours SANS accès au
 * tableau de bord tant que leur premier paiement n'est pas confirmé ici.
 * "Ils ont payé" enregistre le paiement ET active l'accès (voir
 * recordSubscriptionPayment), avec un message WhatsApp de bienvenue.
 */
export async function AwaitingPaymentSection() {
  const supabase = await createClient();

  const { data: awaiting } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, categories, address, commune, city, owner_email, owner_whatsapp, image_url, is_test, created_at"
    )
    .eq("signup_status", "awaiting_payment")
    .order("created_at", { ascending: false });

  const priceByDuration = await fetchPriceByDuration(supabase);
  const ownerNameByBusiness = await resolveOwnerNames(
    supabase,
    (awaiting ?? []).map((b) => b.id)
  );

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Paiement en attente de confirmation
      </h2>
      <p className="mb-3 text-xs text-ink-400">
        Approuvé sous conditions, mais sans accès au tableau de bord tant
        que le paiement de l&apos;abonnement n&apos;est pas confirmé
        ci-dessous.
      </p>
      <div className="space-y-3">
        {(!awaiting || awaiting.length === 0) && (
          <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Aucun paiement en attente de confirmation.
          </p>
        )}
        {awaiting?.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm dark:border-paper/10 dark:bg-ink-800"
          >
            <p className="font-bold text-ink-900 dark:text-paper">
              {b.name}{" "}
              <span className="text-xs font-normal text-ink-400">
                ({b.categories && b.categories.length > 0 ? b.categories.join(", ") : b.main_category})
              </span>{" "}
              {b.is_test && <TestBadge />}
            </p>
            <p className="mb-3 text-sm text-ink-400">
              Gérant : {ownerNameByBusiness.get(b.id) ?? "—"}
              {(b.address || b.commune || b.city) && (
                <>
                  {" "}
                  · {[b.address, b.commune, b.city].filter(Boolean).join(", ")}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-3 sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <SubscriptionPaymentDialog
                  businessId={b.id}
                  businessName={b.name}
                  ownerName={ownerNameByBusiness.get(b.id)}
                  ownerWhatsapp={b.owner_whatsapp}
                  prices={priceByDuration}
                  triggerLabel="Ils ont payé leur abonnement"
                  sendWelcomeMessage
                />
                <ViewSignupDialog
                  details={{
                    businessName: b.name,
                    categories: b.categories ?? [],
                    ownerName: ownerNameByBusiness.get(b.id) ?? null,
                    ownerEmail: b.owner_email,
                    ownerWhatsapp: b.owner_whatsapp,
                    address: b.address,
                    commune: b.commune,
                    city: b.city,
                    imageUrl: b.image_url,
                    createdAt: b.created_at,
                  }}
                />
              </div>
              <form action={rejectBusiness}>
                <input type="hidden" name="id" value={b.id} />
                <ConfirmDeleteButton label="Refuser" />
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
