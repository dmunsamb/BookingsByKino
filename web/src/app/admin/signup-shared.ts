import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { MobileMoneyAccount } from "@/lib/whatsapp";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const DURATION_MONTHS = [1, 3, 12] as const;
export type DurationMonths = (typeof DURATION_MONTHS)[number];

export type OwnerProfile = { id: string; full_name: string | null };

/**
 * Gérant d'un établissement (id + nom), via business_owners (pas
 * profiles.business_id directement) : un gérant de plusieurs salons n'a
 * qu'un seul business_id "actif" à la fois — ses autres établissements ne
 * s'y retrouveraient pas sinon (voir migration 0021). L'id sert par
 * exemple à réinitialiser son mot de passe depuis /admin (voir
 * reset-password-button.tsx).
 */
export async function resolveOwnerProfiles(
  supabase: Supabase,
  businessIds: string[]
): Promise<Map<string, OwnerProfile>> {
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

  const profileById = new Map(
    (ownerProfiles ?? []).map((p) => [p.id, p as OwnerProfile])
  );
  return new Map(
    (ownerLinks ?? [])
      .map((l): [string, OwnerProfile] | null => {
        const profile = profileById.get(l.profile_id);
        return profile ? [l.business_id, profile] : null;
      })
      .filter((entry): entry is [string, OwnerProfile] => entry !== null)
  );
}

/** Variante ne renvoyant que le nom — partagée entre PendingSignupsSection et AwaitingPaymentSection. */
export async function resolveOwnerNames(
  supabase: Supabase,
  businessIds: string[]
): Promise<Map<string, string | null>> {
  const ownerProfiles = await resolveOwnerProfiles(supabase, businessIds);
  return new Map(
    Array.from(ownerProfiles.entries()).map(([businessId, p]) => [
      businessId,
      p.full_name,
    ])
  );
}

export type SubscriptionPlan = {
  id: string;
  name: string;
  active: boolean;
  prices: Record<DurationMonths, number>;
};

type PlanRow = {
  id: string;
  name: string;
  active: boolean;
  subscription_plan_prices: { duration_months: number; amount_usd: number }[];
};

function toPlan(row: PlanRow): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    prices: Object.fromEntries(
      DURATION_MONTHS.map((m) => [
        m,
        row.subscription_plan_prices.find((p) => p.duration_months === m)
          ?.amount_usd ?? 0,
      ])
    ) as Record<DurationMonths, number>,
  };
}

/** Tous les plans (actifs et désactivés) — gestion des tarifs dans /admin. */
export async function fetchAllSubscriptionPlans(
  supabase: Supabase
): Promise<SubscriptionPlan[]> {
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, name, active, subscription_plan_prices(duration_months, amount_usd)")
    .order("created_at");

  return ((data ?? []) as PlanRow[]).map(toPlan);
}

/** Plans proposables à un nouveau salon (approbation "sous conditions"). */
export async function fetchActiveSubscriptionPlans(
  supabase: Supabase
): Promise<SubscriptionPlan[]> {
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, name, active, subscription_plan_prices(duration_months, amount_usd)")
    .eq("active", true)
    .order("created_at");

  return ((data ?? []) as PlanRow[]).map(toPlan);
}

/**
 * Plans auxquels chaque établissement a droit (choisis par l'admin à
 * l'approbation, voir conditionallyApproveBusiness) — pour proposer le bon
 * choix à l'enregistrement d'un paiement (SubscriptionPaymentDialog).
 */
export async function fetchEligiblePlansByBusiness(
  supabase: Supabase,
  businessIds: string[]
): Promise<Map<string, SubscriptionPlan[]>> {
  const map = new Map<string, SubscriptionPlan[]>();
  if (businessIds.length === 0) return map;

  const { data } = await supabase
    .from("business_subscription_plans")
    .select(
      "business_id, subscription_plans(id, name, active, subscription_plan_prices(duration_months, amount_usd))"
    )
    .in("business_id", businessIds);

  for (const row of (data ?? []) as unknown as {
    business_id: string;
    subscription_plans: PlanRow | null;
  }[]) {
    if (!row.subscription_plans) continue;
    const list = map.get(row.business_id) ?? [];
    list.push(toPlan(row.subscription_plans));
    map.set(row.business_id, list);
  }

  return map;
}

export type PlatformContactInfo = {
  contactName: string | null;
  contactWhatsapp: string | null;
};

/**
 * Numéros mobile money DE KINOBOOKING (pour le message "sous conditions"
 * envoyé à l'inscription) + contact de secours — voir
 * platform-payment-settings-form.tsx / migration 0029.
 */
export async function fetchPlatformAccounts(
  supabase: Supabase
): Promise<{ accounts: MobileMoneyAccount[] } & PlatformContactInfo> {
  const { data: settings } = await supabase
    .from("platform_payment_settings")
    .select(
      "mpesa_number, mpesa_holder_name, orange_money_number, orange_money_holder_name, contact_name, contact_whatsapp"
    )
    .eq("id", true)
    .maybeSingle();

  const accounts: MobileMoneyAccount[] = (
    [
      ["mpesa", settings?.mpesa_number, settings?.mpesa_holder_name],
      [
        "orange_money",
        settings?.orange_money_number,
        settings?.orange_money_holder_name,
      ],
    ] as [
      MobileMoneyAccount["provider"],
      string | null | undefined,
      string | null | undefined,
    ][]
  )
    .filter(([, number]) => !!number)
    .map(([provider, number, holderName]) => ({
      provider,
      number: number as string,
      holderName: holderName ?? null,
    }));

  return {
    accounts,
    contactName: settings?.contact_name ?? null,
    contactWhatsapp: settings?.contact_whatsapp ?? null,
  };
}
