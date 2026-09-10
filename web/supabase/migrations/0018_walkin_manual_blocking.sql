-- Support DB pour trois fonctionnalités manquantes identifiées à l'audit :
-- le ticket "sans rendez-vous" (file d'attente), la création manuelle
-- d'une réservation par le personnel, et le blocage de créneaux (congé).
--
-- Les policies RLS nécessaires existent déjà depuis 0002
-- (public_insert_klant_bookings autorise déjà source=walk_in avec
-- status=confirmed ; staff_insert_manual_entries autorise déjà le
-- personnel à insérer n'importe quelle source) — seule la logique de
-- capacité doit évoluer.

-- Un ticket "sans rendez-vous" représente une place dans une file
-- d'attente, pas un créneau réservé au sens de l'agenda : il ne doit
-- jamais être refusé au motif que le créneau est "complet". La
-- vérification "l'établissement est-il ouvert maintenant ?" est déjà
-- faite côté application (voir web/src/lib/availability.ts::currentSlotStart)
-- avant de proposer le ticket au client. On bypass donc le contrôle de
-- capacité pour cette source, comme c'est déjà le cas pour "blokkering".
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

-- Blocage de créneaux (congé, indisponibilité) : un blocage sur une
-- plage horaire crée plusieurs lignes "blokkering" (une par créneau,
-- alignées sur la même grille que generateSlotsForDate), regroupées par
-- block_group_id pour pouvoir être affichées et supprimées comme un seul
-- blocage dans le dashboard (FR-9.3, US-O14/US-S4).
alter table public.agenda_entries
  add column block_group_id uuid;

-- get_agenda_capacity doit refléter les blocages : un "blokkering" rend
-- son créneau indisponible quel que soit le nombre de réservations déjà
-- en place à cet horaire (d'où un grand nombre plutôt qu'un simple +1,
-- pour être certain de dépasser n'importe quelle capacité configurée).
create or replace function public.get_agenda_capacity(p_business_id uuid)
returns table (start_time timestamptz, end_time timestamptz, booked_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    ae.start_time,
    ae.end_time,
    case
      when bool_or(ae.source = 'blokkering') then 999999::bigint
      else count(*)
    end as booked_count
  from public.agenda_entries ae
  where ae.business_id = p_business_id
    and (
      ae.status in ('pending_approval', 'approved_waiting_payment', 'confirmed')
      or ae.source = 'blokkering'
    )
  group by ae.start_time, ae.end_time;
$$;

-- Compteur informatif "vous êtes le Nème dans la file" affiché au client
-- après avoir pris un ticket walk-in. Recalculé à chaque appel (jamais
-- stocké, donc jamais désynchronisé) ; un petit risque de collision entre
-- deux tickets pris à la même seconde est accepté, ce n'est qu'un
-- affichage — l'identité réelle et unique du ticket reste
-- reference_number (agenda_reference_seq, 0012).
create or replace function public.count_walk_in_tickets_today(p_business_id uuid)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.agenda_entries
  where business_id = p_business_id
    and source = 'walk_in'
    and (start_time at time zone 'Africa/Kinshasa')::date
      = (now() at time zone 'Africa/Kinshasa')::date;
$$;

grant execute on function public.count_walk_in_tickets_today(uuid) to anon, authenticated;
