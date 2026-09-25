-- Remplace le tarif unique global (subscription_prices, migration 0017)
-- par plusieurs plans tarifaires nommés, chacun avec son propre tarif par
-- durée (1/3/12 mois). L'admin choisit, au moment d'"Approuver sous
-- conditions" un nouveau salon, les plans auxquels il a droit — avant
-- même de lui envoyer le message WhatsApp de tarifs.
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscription_plan_prices (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  duration_months smallint not null check (duration_months in (1, 3, 12)),
  amount_usd numeric(10, 2) not null check (amount_usd >= 0),
  primary key (plan_id, duration_months)
);

-- Plans auxquels un établissement a droit (choisis par l'admin à
-- l'approbation "sous conditions") — un établissement peut être éligible
-- à plusieurs plans à la fois (ex. tarif standard ET un tarif négocié).
create table public.business_subscription_plans (
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  primary key (business_id, plan_id)
);

-- Plan effectivement payé/actif pour l'établissement — présélectionné à
-- un renouvellement, et utile pour un futur affichage côté dashboard.
alter table public.businesses
  add column subscription_plan_id uuid references public.subscription_plans(id) on delete set null;

alter table public.subscription_payments
  add column plan_id uuid references public.subscription_plans(id) on delete set null;

-- Backfill : le tarif unique existant devient le plan "Standard", pour ne
-- rien casser pour les établissements déjà en cours d'abonnement.
insert into public.subscription_plans (name) values ('Standard');

insert into public.subscription_plan_prices (plan_id, duration_months, amount_usd)
select
  (select id from public.subscription_plans where name = 'Standard'),
  duration_months,
  amount_usd
from public.subscription_prices;

-- Tout établissement déjà approuvé ou en attente de paiement devient
-- éligible au plan Standard (sinon le flux de paiement/renouvellement
-- serait bloqué pour l'existant tant que l'admin ne lui assigne rien).
insert into public.business_subscription_plans (business_id, plan_id)
select b.id, (select id from public.subscription_plans where name = 'Standard')
from public.businesses b
where b.signup_status in ('awaiting_payment', 'approved');

update public.businesses
set subscription_plan_id = (select id from public.subscription_plans where name = 'Standard')
where signup_status = 'approved';

drop policy if exists "platform_admin_all_subscription_prices" on public.subscription_prices;
drop table public.subscription_prices;

alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_prices enable row level security;
alter table public.business_subscription_plans enable row level security;

create policy "platform_admin_all_subscription_plans"
  on public.subscription_plans for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admin_all_subscription_plan_prices"
  on public.subscription_plan_prices for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admin_all_business_subscription_plans"
  on public.business_subscription_plans for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Lecture pour un gérant/personnel connecté : le catalogue des plans
-- actifs et leurs tarifs (informationnel), et les plans propres à SON
-- établissement — pas de policy publique/anon, ces tarifs n'ont pas
-- vocation à être affichés hors dashboard pour l'instant.
create policy "authenticated_reads_active_plans"
  on public.subscription_plans for select
  to authenticated
  using (active = true or public.is_platform_admin());

create policy "authenticated_reads_active_plan_prices"
  on public.subscription_plan_prices for select
  to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.subscription_plans sp
      where sp.id = plan_id and sp.active
    )
  );

create policy "owner_reads_own_business_subscription_plans"
  on public.business_subscription_plans for select
  to authenticated
  using (public.is_owner_of(business_id));
