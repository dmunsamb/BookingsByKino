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

export async function fetchPriceByDuration(
  supabase: Supabase
): Promise<Record<DurationMonths, number>> {
  const { data: prices } = await supabase
    .from("subscription_prices")
    .select("duration_months, amount_usd");

  return Object.fromEntries(
    DURATION_MONTHS.map((m) => [
      m,
      prices?.find((p) => p.duration_months === m)?.amount_usd ?? 0,
    ])
  ) as Record<DurationMonths, number>;
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
