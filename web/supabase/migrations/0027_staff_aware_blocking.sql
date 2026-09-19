-- Jusqu'ici, un blocage (congé/indisponibilité, 0018) était forcément
-- business-wide : il rendait un créneau indisponible pour tout le monde,
-- quel que soit le membre de l'équipe. Demande : pouvoir bloquer UN
-- membre précis (ex. malade) sans fermer le créneau pour les autres, tout
-- en gardant la possibilité de bloquer "toute l'équipe" (ex. congé
-- collectif).
--
-- On réutilise agenda_entries.staff_id (déjà présent depuis 0021) sur les
-- lignes source='blokkering' : NULL = toute l'équipe (comportement
-- inchangé), une valeur = seul ce membre est bloqué sur ce créneau.

-- ============================================================
-- 1) enforce_agenda_capacity : capacité par créneau = somme des membres
--    dont la règle couvre ce créneau ET qui n'y sont pas bloqués.
-- ============================================================

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
        and blk.start_time = new.start_time
        and blk.source = 'blokkering'
        and (blk.staff_id is null or blk.staff_id = ar.staff_id)
    );

  if v_capacity <= 0 then
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

-- ============================================================
-- 2) get_agenda_capacity : redevient un simple comptage des réservations
--    réelles (le "flag 999999" de 0018 rendait TOUT le créneau complet
--    dès qu'un blocage existait, quel que soit le membre visé — ce qui ne
--    marche plus maintenant qu'un blocage peut ne viser qu'un membre).
--    L'exclusion des membres bloqués se fait désormais côté application,
--    de la même façon que côté trigger ci-dessus (voir generateSlotsForDate).
-- ============================================================

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
    count(*) as booked_count
  from public.agenda_entries ae
  where ae.business_id = p_business_id
    and ae.status in ('pending_approval', 'approved_waiting_payment', 'confirmed')
  group by ae.start_time, ae.end_time;
$$;

grant execute on function public.get_agenda_capacity(uuid) to anon, authenticated;
