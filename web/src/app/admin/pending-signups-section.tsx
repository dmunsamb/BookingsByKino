import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { rejectBusiness } from "./actions";
import { ApproveSignupButton } from "./approve-signup-button";
import { ViewSignupDialog } from "./view-signup-dialog";
import { TestBadge } from "./test-badge";
import {
  fetchActiveSubscriptionPlans,
  fetchPlatformAccounts,
  resolveOwnerNames,
} from "./signup-shared";

/**
 * Liste des inscriptions en attente de validation, avec actions
 * Approuver sous conditions/Refuser en un clic (étape 1/2 du flux
 * d'approbation, voir AwaitingPaymentSection pour l'étape 2/2).
 * Réutilisée sur /admin (panel complet) et sur /dashboard pour
 * platform_admin — jusqu'ici rien ne signalait une nouvelle inscription
 * tant qu'on n'allait pas consulter /admin soi-même ; ceci s'affiche
 * directement à la connexion.
 *
 * `showEmptyState` à false masque complètement la section quand il n'y
 * a rien à valider (utile sur /dashboard, pour ne pas encombrer l'écran
 * d'un admin la plupart du temps) ; à true (par défaut) elle affiche un
 * message explicite (utile sur /admin, un vrai écran de gestion).
 */
export async function PendingSignupsSection({
  showEmptyState = true,
}: {
  showEmptyState?: boolean;
}) {
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("businesses")
    .select(
      "id, name, main_category, categories, address, commune, city, owner_email, owner_whatsapp, image_url, is_test, created_at"
    )
    .eq("signup_status", "pending_approval")
    .order("created_at", { ascending: false });

  if ((!pending || pending.length === 0) && !showEmptyState) {
    return null;
  }

  const activePlans = await fetchActiveSubscriptionPlans(supabase);
  const {
    accounts: platformAccounts,
    contactName,
    contactWhatsapp,
  } = await fetchPlatformAccounts(supabase);
  const ownerNameByBusiness = await resolveOwnerNames(
    supabase,
    (pending ?? []).map((b) => b.id)
  );

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400">
        Inscriptions en attente de validation
      </h2>
      <div className="space-y-3">
        {(!pending || pending.length === 0) && (
          <p className="rounded-2xl border border-ink-900/10 bg-white p-6 text-center text-sm text-ink-400 dark:border-paper/10 dark:bg-ink-800">
            Aucune inscription en attente.
          </p>
        )}
        {pending?.map((b) => (
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
                <ApproveSignupButton
                  businessId={b.id}
                  businessName={b.name}
                  ownerName={ownerNameByBusiness.get(b.id)}
                  ownerWhatsapp={b.owner_whatsapp}
                  plans={activePlans}
                  platformAccounts={platformAccounts}
                  contactName={contactName}
                  contactWhatsapp={contactWhatsapp}
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
