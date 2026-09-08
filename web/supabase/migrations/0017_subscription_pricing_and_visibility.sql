-- Révision du comportement "inactif" (retour utilisateur après 0016) :
-- le catalogue public ne doit plus dépendre de l'abonnement — un
-- établissement approuvé reste listé et consultable même en retard de
-- paiement. C'est la fiche établissement (app) qui masque les coordonnées
-- et désactive la réservation quand le statut calculé est "inactif" (voir
-- web/src/lib/subscription.ts). On revient donc à la policy simple de
-- 0014, sans la fenêtre de grâce d'un mois ajoutée en 0016.
drop policy if exists "public_read_businesses" on public.businesses;
create policy "public_read_businesses"
  on public.businesses for select
  using (signup_status = 'approved' or public.is_owner_of(id));

-- Défense en profondeur : même si l'UI ne propose plus la réservation
-- pour un établissement inactif, un appel direct à l'API ne doit pas
-- pouvoir créer une réservation client (source = klant_app) pour un
-- établissement dont l'abonnement dépasse le délai de grâce de 7 jours
-- (même seuil que getSubscriptionStatus côté app). Le personnel/gérant
-- garde la main pour ses propres écritures (source != klant_app).
create or replace function public.enforce_agenda_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_booked integer;
  v_weekday integer;
  v_local_time time;
  v_local_date date;
  v_paid_until timestamptz;
begin
  if new.source = 'blokkering' then
    return new;
  end if;

  v_local_date := (new.start_time at time zone 'Africa/Kinshasa')::date;

  if tg_op = 'INSERT' and new.source = 'klant_app' then
    if v_local_date <= (now() at time zone 'Africa/Kinshasa')::date then
      raise exception 'Les réservations en ligne ne sont possibles qu''à partir de demain.';
    end if;

    select subscription_paid_until into v_paid_until
    from public.businesses
    where id = new.business_id;

    if v_paid_until is not null and now() > v_paid_until + interval '7 days' then
      raise exception 'Cet établissement n''accepte plus de nouvelles réservations pour le moment.';
    end if;
  end if;

  v_weekday := extract(dow from new.start_time at time zone 'Africa/Kinshasa');
  v_local_time := (new.start_time at time zone 'Africa/Kinshasa')::time;

  select capacity into v_capacity
  from public.availability_rules
  where business_id = new.business_id
    and weekday = v_weekday
    and v_local_time >= start_time
    and v_local_time < end_time
  limit 1;

  if v_capacity is null then
    raise exception 'Aucune plage de disponibilité ne correspond à ce créneau.';
  end if;

  select count(*) into v_booked
  from public.agenda_entries
  where business_id = new.business_id
    and start_time = new.start_time
    and status in ('pending_approval', 'approved_waiting_payment', 'confirmed')
    and id <> new.id;

  if v_booked >= v_capacity then
    raise exception 'Ce créneau est complet.';
  end if;

  return new;
end;
$$;

-- Marqueur "établissement de test" — Nouschka sert de pilote et doit être
-- clairement identifiable comme tel dans l'administration KinoBooking
-- (jamais affiché côté public : il peut être présenté à de vrais
-- prospects pendant la phase de test).
alter table public.businesses
  add column is_test boolean not null default false;

-- Fonction utilitaire dédiée (plus lisible que de détourner is_owner_of
-- avec un business_id arbitraire) pour les tables qui ne concernent que
-- l'équipe KinoBooking, pas un établissement en particulier. SECURITY
-- INVOKER comme is_owner_of/is_staff_of (0003) : elle ne lit que la ligne
-- "profiles" de l'utilisateur courant, déjà lisible via
-- user_reads_own_profile — pas besoin de SECURITY DEFINER.
create or replace function public.is_platform_admin()
returns boolean
language sql
security invoker
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'platform_admin'
  );
$$;

-- Tarifs configurables de l'abonnement KinoBooking (1/3/12 mois), pour
-- pré-remplir le montant lors de l'enregistrement d'un paiement gérant.
create table public.subscription_prices (
  duration_months smallint primary key check (duration_months in (1, 3, 12)),
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  updated_at timestamptz not null default now()
);

insert into public.subscription_prices (duration_months, amount_usd) values
  (1, 0), (3, 0), (12, 0);

alter table public.subscription_prices enable row level security;

create policy "platform_admin_all_subscription_prices"
  on public.subscription_prices for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Historique des paiements d'abonnement gérant, pour permettre plus tard
-- des rapports financiers mensuels (total encaissé, par établissement,
-- par période...).
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  duration_months smallint not null check (duration_months > 0),
  recorded_by uuid references public.profiles(id),
  recorded_at timestamptz not null default now()
);

create index subscription_payments_business_id_idx
  on public.subscription_payments(business_id);

alter table public.subscription_payments enable row level security;

create policy "platform_admin_all_subscription_payments"
  on public.subscription_payments for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
