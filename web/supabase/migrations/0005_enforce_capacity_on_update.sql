-- Étend le contrôle de capacité (0004) aux modifications manuelles d'un
-- créneau existant par le gérant/personnel (US-O14 : édition d'une
-- réservation). Sans ceci, un UPDATE direct sur start_time contournerait
-- totalement la capacité déclarée : le trigger de 0004 ne s'exécutait
-- qu'à l'INSERT.
--
-- Le comptage exclut désormais la ligne en cours de modification
-- (id <> new.id), sinon une réservation existante se compterait
-- elle-même et bloquerait sa propre édition (y compris sans changement
-- réel d'horaire) une fois la capacité atteinte.

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
begin
  -- Les blocages (congés, etc.) ne consomment pas de capacité.
  if new.source = 'blokkering' then
    return new;
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

drop trigger if exists agenda_entries_enforce_capacity on public.agenda_entries;
create trigger agenda_entries_enforce_capacity
  before insert or update of start_time on public.agenda_entries
  for each row execute function public.enforce_agenda_capacity();
