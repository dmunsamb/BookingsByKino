-- Jusqu'ici, "Approuver" une inscription enregistrait dans le même geste
-- un paiement d'abonnement déjà reçu (voir approveBusiness) — supposant
-- que le gérant avait payé AVANT même d'avoir accès à son tableau de
-- bord. Nouveau flux demandé : approuver donne accès tout de suite, "sous
-- réserve" du paiement de l'abonnement, avec un message WhatsApp au
-- gérant listant les tarifs et le(s) numéro(s) mobile money de
-- KinoBooking (pas ceux du gérant, qui servent à recevoir SES clients —
-- businesses.mpesa_number/orange_money_number, migration 0017/plus tard).
--
-- subscription_paid_until reste donc null après approbation — déjà
-- traité comme "actif" par lib/subscription.ts ("jamais facturé ... on
-- ne pénalise pas un établissement avant même sa première échéance").
-- Le premier paiement, une fois reçu, s'enregistre exactement comme un
-- renouvellement (recordSubscriptionPayment gère déjà correctement le
-- cas paid_until = null).

create table public.platform_payment_settings (
  id boolean primary key default true,
  mpesa_number text,
  mpesa_holder_name text,
  orange_money_number text,
  orange_money_holder_name text,
  contact_name text,
  contact_whatsapp text,
  updated_at timestamptz not null default now(),
  constraint platform_payment_settings_single_row check (id)
);

insert into public.platform_payment_settings (id) values (true);

alter table public.platform_payment_settings enable row level security;

create policy "platform_admin_all_platform_payment_settings"
  on public.platform_payment_settings for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
