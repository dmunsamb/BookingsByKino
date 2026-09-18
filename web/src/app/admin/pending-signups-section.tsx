import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { rejectBusiness } from "./actions";
import { SubscriptionPaymentDialog } from "./subscription-payment-dialog";
import { TestBadge } from "./test-badge";

const DURATION_MONTHS = [1, 3, 12] as const;

/**
 * Liste des inscriptions en attente de validation, avec actions
 * Approuver/Refuser en un clic. Réutilisée sur /admin (panel complet)
 * et sur /dashboard pour platform_admin — jusqu'ici rien ne signalait
 * une nouvelle inscription tant qu'on n'allait pas consulter /admin soi-
 * même ; ceci s'affiche directement à la connexion.
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
      "id, name, main_category, sub_category, address, city, owner_whatsapp, is_test, created_at"
    )
    .eq("signup_status", "pending_approval")
    .order("created_at", { ascending: false });

  if ((!pending || pending.length === 0) && !showEmptyState) {
    return null;
  }

  const { data: prices } = await supabase
    .from("subscription_prices")
    .select("duration_months, amount_usd");

  const priceByDuration = Object.fromEntries(
    DURATION_MONTHS.map((m) => [
      m,
      prices?.find((p) => p.duration_months === m)?.amount_usd ?? 0,
    ])
  ) as Record<(typeof DURATION_MONTHS)[number], number>;

  const businessIds = (pending ?? []).map((b) => b.id);
  const { data: owners } = businessIds.length
    ? await supabase
        .from("profiles")
        .select("business_id, full_name")
        .in("business_id", businessIds)
        .eq("role", "owner")
    : { data: [] };

  const ownerNameByBusiness = new Map(
    (owners ?? []).map((o) => [o.business_id, o.full_name])
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
                ({b.sub_category ?? b.main_category})
              </span>{" "}
              {b.is_test && <TestBadge />}
            </p>
            <p className="mb-3 text-sm text-ink-400">
              Gérant : {ownerNameByBusiness.get(b.id) ?? "—"}
              {(b.address || b.city) && (
                <> · {[b.address, b.city].filter(Boolean).join(", ")}</>
              )}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SubscriptionPaymentDialog
                businessId={b.id}
                businessName={b.name}
                ownerName={ownerNameByBusiness.get(b.id)}
                ownerWhatsapp={b.owner_whatsapp}
                prices={priceByDuration}
                mode="approve"
                triggerLabel="Approuver"
              />
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
