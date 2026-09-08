-- Applique réellement la capacité déclarée dans availability_rules au
-- moment de l'insertion, plutôt que de compter uniquement sur le filtrage
-- fait côté interface (FR-9.7, BR-10 : l'agenda est l'unique source de
-- vérité). Sans ceci, un appel direct à l'API pourrait contourner la
-- limite de capacité même si l'UI ne propose jamais un créneau complet.
--
-- Limite connue : sous forte concurrence, deux insertions simultanées
-- pourraient toutes deux passer le contrôle avant que l'une des deux ne
-- soit validée (isolation READ COMMITTED par défaut). Acceptable à
-- l'échelle d'un pilote ; un verrou explicite serait nécessaire pour une
-- garantie stricte à plus grande échelle.
--
-- Appliqué en direct sur le projet via le MCP Supabase le 2026-09-08 ;
-- ce fichier documente le même changement pour que le schéma versionné
-- reste synchronisé avec la base.

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
    and status in ('pending_approval', 'approved_waiting_payment', 'confirmed');

  if v_booked >= v_capacity then
    raise exception 'Ce créneau est complet.';
  end if;

  return new;
end;
$$;

drop trigger if exists agenda_entries_enforce_capacity on public.agenda_entries;
create trigger agenda_entries_enforce_capacity
  before insert on public.agenda_entries
  for each row execute function public.enforce_agenda_capacity();
