-- Corrige un trou trouvé lors des tests de bout en bout avant déploiement :
-- un blocage (0018) rendait bien un créneau "indisponible" dans la liste
-- affichée au client (get_agenda_capacity), mais rien n'empêchait au
-- niveau du trigger qu'une réservation cliente (klant_app) ou manuelle
-- (manueel) soit quand même insérée sur ce créneau bloqué — seule l'UI le
-- cachait. Défense en profondeur manquante, comme pour le délai minimum
-- ou le statut d'abonnement inactif (déjà vérifiés ici).
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
