-- Module "file d'attente sans rendez-vous" (US-C4 étendu) :
-- - Le salon peut définir une capacité max (optionnelle, illimitée par
--   défaut) et ouvrir/fermer la file indépendamment du toggle "en ligne"
--   (qui ne concerne que les RDV).
-- - Chaque ticket peut porter une note libre, et être "décalé" une seule
--   fois (le client demande à laisser passer 1, 2 ou 3 personnes sans
--   perdre sa place définitivement).
-- - Une vue publique anonymisée (prénom + position, jamais le téléphone)
--   permet à n'importe qui de suivre la file sans compte.

alter table public.businesses
  add column walkin_queue_open boolean not null default true,
  add column walkin_queue_capacity integer
    constraint walkin_queue_capacity_positive check (walkin_queue_capacity is null or walkin_queue_capacity > 0);

alter table public.agenda_entries
  add column client_note text,
  add column queue_bumped_at timestamptz,
  add column queue_shift_used boolean not null default false;

-- Le personnel modifie déjà librement l'agenda de son établissement via
-- staff_update_own_agenda (is_staff_of) : aucune nouvelle policy RLS
-- n'est nécessaire pour "prise en charge" (staff_id), "décaler"
-- (queue_bumped_at/queue_shift_used) ou la clôture (status).

-- ============================================================
-- Vue publique anonymisée de la file d'attente
-- ============================================================
-- Même principe que agenda_capacity_public (0002) : PAS de
-- security_invoker, la vue tourne avec les privilèges de son
-- propriétaire (pas ceux d'anon), donc elle peut lire agenda_entries
-- même si anon n'a directement aucune policy SELECT dessus — seules les
-- colonnes explicitement sélectionnées ici (prénom, position) sortent de
-- la vue, jamais le téléphone ni le nom complet.
create or replace view public.walkin_queue_public as
select
  business_id,
  split_part(coalesce(client_name, ''), ' ', 1) as first_name,
  row_number() over (
    partition by business_id
    order by coalesce(queue_bumped_at, created_at)
  ) as position
from public.agenda_entries
where source = 'walk_in'
  and status = 'confirmed'
  and staff_id is null;

grant select on public.walkin_queue_public to anon, authenticated;

-- ============================================================
-- Trigger : ouverture + capacité de la file, vérifiées à l'insertion
-- ============================================================
-- Reprend intégralement enforce_agenda_capacity (0031 : is_online :
-- 0032 : chevauchement d'intervalles) — ce create or replace remplace
-- toute la fonction, donc elle doit porter TOUS les correctifs déjà en
-- production pour ne rien régresser. Seul changement : le early-return
-- pour source='walk_in' devient conditionnel (ouverture + capacité),
-- au lieu d'un bypass total ; 'blokkering' garde son bypass inchangé.
-- Les UPDATE (prise en charge, no-show, décaler...) ne passent jamais
-- par ce bloc, qui ne s'applique qu'à l'INSERT d'un nouveau ticket.
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
  v_is_online boolean;
  v_end_time timestamptz;
  v_queue_open boolean;
  v_queue_capacity integer;
  v_queue_count integer;
begin
  if new.source = 'blokkering' then
    return new;
  end if;

  if new.source = 'walk_in' then
    if tg_op = 'INSERT' then
      select walkin_queue_open, walkin_queue_capacity
        into v_queue_open, v_queue_capacity
      from public.businesses
      where id = new.business_id;

      if not coalesce(v_queue_open, true) then
        raise exception 'La file d''attente sans rendez-vous est fermée pour le moment.';
      end if;

      if v_queue_capacity is not null then
        select count(*) into v_queue_count
        from public.agenda_entries
        where business_id = new.business_id
          and source = 'walk_in'
          and status = 'confirmed';

        if v_queue_count >= v_queue_capacity then
          raise exception 'La file d''attente est complète pour le moment.';
        end if;
      end if;
    end if;

    return new;
  end if;

  v_local_date := (new.start_time at time zone 'Africa/Kinshasa')::date;
  v_end_time := coalesce(new.end_time, new.start_time);

  if tg_op = 'INSERT' and new.source = 'klant_app' then
    if v_local_date <= (now() at time zone 'Africa/Kinshasa')::date then
      raise exception 'Les réservations en ligne ne sont possibles qu''à partir de demain.';
    end if;

    select subscription_paid_until, is_online into v_paid_until, v_is_online
    from public.businesses
    where id = new.business_id;

    if v_paid_until is not null and now() > v_paid_until + interval '7 days' then
      raise exception 'Cet établissement n''accepte plus de nouvelles réservations pour le moment.';
    end if;

    if not coalesce(v_is_online, false) then
      raise exception 'Cet établissement n''accepte pas encore de réservations en ligne.';
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

-- ============================================================
-- Vue dashboard : expose les nouvelles colonnes au personnel
-- ============================================================
create or replace view public.agenda_entries_for_dashboard
with (security_invoker = true) as
select
  ae.id,
  ae.business_id,
  ae.service_id,
  ae.source,
  ae.status,
  ae.client_name,
  case
    when p.role in ('owner', 'platform_admin') then ae.client_phone
    when ae.client_phone is null then null
    else left(ae.client_phone, 3) || ' *** ' || right(ae.client_phone, 2)
  end as client_phone_display,
  ae.is_vip,
  ae.start_time,
  ae.end_time,
  ae.deposit_cdf,
  ae.payment_ref,
  ae.created_at,
  ae.reference_number,
  ae.staff_id,
  sm.name as staff_name,
  ae.client_note,
  ae.queue_bumped_at,
  ae.queue_shift_used
from public.agenda_entries ae
join public.profiles p on p.id = auth.uid()
left join public.staff_members sm on sm.id = ae.staff_id
where public.is_staff_of(ae.business_id);
