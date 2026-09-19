-- Bug constaté en production : un service de 60 min réservé à 10h00
-- laissait le créneau 10h30 affiché comme libre, et acceptait même une
-- deuxième réservation dessus — la capacité n'était comparée que sur une
-- égalité stricte de start_time, sans jamais regarder si les deux
-- réservations se chevauchaient réellement dans le temps.
--
-- Remplace ce contrôle par un vrai test de chevauchement d'intervalles
-- (start_time, end_time) — end_time est déjà renseigné à la création pour
-- toutes les sources concernées (klant_app, manueel ; walk_in/blokkering
-- sont déjà exclus plus haut dans la fonction). Même principe appliqué au
-- blocage (congé/indisponibilité) : un congé de 10h00 à 12h00 doit aussi
-- neutraliser la capacité d'un service démarrant à 10h30, pas seulement
-- un service démarrant pile à 10h00.
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
  v_end_time timestamptz;
begin
  if new.source in ('blokkering', 'walk_in') then
    return new;
  end if;

  v_local_date := (new.start_time at time zone 'Africa/Kinshasa')::date;
  v_end_time := coalesce(new.end_time, new.start_time);

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

  select coalesce(sum(ar.capacity), 0) into v_capacity
  from public.availability_rules ar
  where ar.business_id = new.business_id
    and ar.weekday = v_weekday
    and v_local_time >= ar.start_time
    and v_local_time < ar.end_time
    and not exists (
      select 1
      from public.agenda_entries blk
      where blk.business_id = new.business_id
        and blk.source = 'blokkering'
        and blk.start_time < v_end_time
        and blk.end_time > new.start_time
        and (blk.staff_id is null or blk.staff_id = ar.staff_id)
    );

  if v_capacity <= 0 then
    raise exception 'Aucune plage de disponibilité ne correspond à ce créneau.';
  end if;

  select count(*) into v_booked
  from public.agenda_entries
  where business_id = new.business_id
    and status in ('pending_approval', 'approved_waiting_payment', 'confirmed')
    and id <> new.id
    and start_time < v_end_time
    and coalesce(end_time, start_time) > new.start_time;

  if v_booked >= v_capacity then
    raise exception 'Ce créneau est complet.';
  end if;

  return new;
end;
$$;
