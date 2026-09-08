-- Une réservation client (source = klant_app) n'est possible qu'à partir
-- du lendemain, jamais le jour même (laisse le temps à l'établissement de
-- valider/préparer). Vérifié uniquement à la création (TG_OP = 'INSERT') :
-- une fois la réservation créée, le gérant peut toujours la déplacer
-- librement via l'écran d'édition (US-O14), y compris vers aujourd'hui si
-- besoin — cette règle encadre la prise de rendez-vous en libre-service,
-- pas les corrections manuelles du personnel.

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
begin
  if new.source = 'blokkering' then
    return new;
  end if;

  v_local_date := (new.start_time at time zone 'Africa/Kinshasa')::date;

  if tg_op = 'INSERT'
     and new.source = 'klant_app'
     and v_local_date <= (now() at time zone 'Africa/Kinshasa')::date then
    raise exception 'Les réservations en ligne ne sont possibles qu''à partir de demain.';
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
