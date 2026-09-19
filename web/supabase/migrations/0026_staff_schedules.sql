-- Jusqu'ici, "Horaires et capacité" (availability_rules) représentait à la
-- fois les heures d'ouverture du salon ET la capacité de réservation,
-- business-wide, sans notion de membre de l'équipe.
--
-- Nouveau modèle demandé :
-- 1) business_hours : les heures d'ouverture du salon (jour/début/fin,
--    SANS créneau ni capacité) — affichées et éditées depuis
--    Configuration → Mon établissement.
-- 2) availability_rules devient le planning PAR membre de l'équipe : un
--    horaire ajouté doit être assigné à un staff_member, et sa capacité
--    s'ajoute à celle des autres membres présents au même moment
--    (enforce_agenda_capacity somme désormais sur toutes les règles qui
--    couvrent le créneau, au lieu de n'en lire qu'une seule au hasard).
--
-- Rétrocompatibilité : les availability_rules déjà existantes (toutes
-- sans staff_id, colonne inexistante avant cette migration) continuent de
-- compter dans la capacité telle quelle — on ne les supprime pas, elles
-- sont simplement dupliquées vers business_hours pour ne pas faire
-- disparaître les heures d'ouverture déjà configurées par les gérants.

-- ============================================================
-- 1) business_hours
-- ============================================================

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  created_at timestamptz not null default now()
);

create index business_hours_business_idx on public.business_hours (business_id);

alter table public.business_hours enable row level security;

create policy "public_read_business_hours"
  on public.business_hours for select
  using (true);

create policy "owner_write_business_hours"
  on public.business_hours for insert
  to authenticated
  with check (public.is_owner_of(business_id));

create policy "owner_update_business_hours"
  on public.business_hours for update
  using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));

create policy "owner_delete_business_hours"
  on public.business_hours for delete
  using (public.is_owner_of(business_id));

insert into public.business_hours (business_id, weekday, start_time, end_time)
select distinct business_id, weekday, start_time, end_time
from public.availability_rules;

-- ============================================================
-- 2) availability_rules.staff_id
-- ============================================================

alter table public.availability_rules
  add column staff_id uuid references public.staff_members (id) on delete cascade;

create index availability_rules_staff_idx on public.availability_rules (staff_id);

-- La capacité totale d'un créneau est désormais la somme des règles de
-- tous les membres de l'équipe qui couvrent ce créneau (avant : une seule
-- ligne était lue arbitrairement via LIMIT 1). Avec au plus une règle par
-- horaire — le cas de toutes les données existantes au moment de cette
-- migration — le résultat est strictement identique à avant. Le reste du
-- corps (délai minimum, abonnement, blocages) reprend tel quel la version
-- vivante en production (0019_enforce_blocking_at_trigger_level.sql).
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
  v_blocked boolean;
begin
  if new.source in ('blokkering', 'walk_in') then
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

  select exists (
    select 1
    from public.agenda_entries
    where business_id = new.business_id
      and start_time = new.start_time
      and source = 'blokkering'
  ) into v_blocked;

  if v_blocked then
    raise exception 'Ce créneau est bloqué.';
  end if;

  v_weekday := extract(dow from new.start_time at time zone 'Africa/Kinshasa');
  v_local_time := (new.start_time at time zone 'Africa/Kinshasa')::time;

  select sum(capacity) into v_capacity
  from public.availability_rules
  where business_id = new.business_id
    and weekday = v_weekday
    and v_local_time >= start_time
    and v_local_time < end_time;

  if v_capacity is null or v_capacity <= 0 then
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
