import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { rejectBusiness } from "./actions";
import { ApproveSignupButton } from "./approve-signup-button";
import { TestBadge } from "./test-badge";
import type { MobileMoneyAccount } from "@/lib/whatsapp";

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
      "id, name, main_category, categories, address, commune, city, owner_whatsapp, is_test, created_at"
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

  const { data: paymentSettings } = await supabase
    .from("platform_payment_settings")
    .select(
      "mpesa_number, mpesa_holder_name, orange_money_number, orange_money_holder_name, contact_name, contact_whatsapp"
    )
    .eq("id", true)
    .maybeSingle();

  const platformAccounts: MobileMoneyAccount[] = (
    [
      [
        "mpesa",
        paymentSettings?.mpesa_number,
        paymentSettings?.mpesa_holder_name,
      ],
      [
        "orange_money",
        paymentSettings?.orange_money_number,
        paymentSettings?.orange_money_holder_name,
      ],
    ] as [MobileMoneyAccount["provider"], string | null | undefined, string | null | undefined][]
  )
    .filter(([, number]) => !!number)
    .map(([provider, number, holderName]) => ({
      provider,
      number: number as string,
      holderName: holderName ?? null,
    }));

  // Passe par business_owners (plutôt que profiles.business_id
  // directement) : un gérant qui possède plusieurs établissements n'a
  // qu'un seul business_id "actif" à la fois — ses autres établissements
  // ne s'y retrouveraient pas sinon (voir migration 0021).
  const businessIds = (pending ?? []).map((b) => b.id);
  const { data: ownerLinks } = businessIds.length
    ? await supabase
        .from("business_owners")
        .select("business_id, profile_id")
        .in("business_id", businessIds)
    : { data: [] };

  const ownerProfileIds = [
    ...new Set((ownerLinks ?? []).map((l) => l.profile_id)),
  ];
  const { data: ownerProfiles } = ownerProfileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerProfileIds)
    : { data: [] };

  const nameByProfileId = new Map(
    (ownerProfiles ?? []).map((p) => [p.id, p.full_name])
  );
  const ownerNameByBusiness = new Map(
    (ownerLinks ?? []).map((l) => [
      l.business_id,
      nameByProfileId.get(l.profile_id) ?? null,
    ])
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ApproveSignupButton
                businessId={b.id}
                businessName={b.name}
                ownerName={ownerNameByBusiness.get(b.id)}
                ownerWhatsapp={b.owner_whatsapp}
                prices={priceByDuration}
                platformAccounts={platformAccounts}
                contactName={paymentSettings?.contact_name}
                contactWhatsapp={paymentSettings?.contact_whatsapp}
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
