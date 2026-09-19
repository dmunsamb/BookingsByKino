-- Toggle "en ligne" côté gérant, indépendant de signup_status (contrôlé
-- par KinoBooking) et de subscription_paid_until (facturation) : même un
-- établissement approuvé et à jour peut vouloir rester invisible tant que
-- son catalogue/ses horaires ne sont pas prêts, ou se mettre en pause
-- temporairement (congés...).
--
-- Défaut à false : un nouveau salon démarre hors ligne, comme demandé —
-- mais il faut backfiller les établissements déjà approuvés à true,
-- sinon cette migration les ferait disparaître instantanément du
-- catalogue public (Nouschka, Shanayah Beauty...), déjà en activité.
alter table public.businesses
  add column is_online boolean not null default false;

update public.businesses set is_online = true where signup_status = 'approved';

-- La visibilité publique (catalogue, fiche établissement) exige
-- désormais aussi is_online, en plus de signup_status = 'approved' — le
-- propriétaire (ou platform_admin, via is_owner_of) continue de voir son
-- propre établissement quel que soit l'état du toggle, pour gérer son
-- dashboard et prévisualiser avant de passer en ligne.
drop policy if exists "public_read_businesses" on public.businesses;
create policy "public_read_businesses"
  on public.businesses for select
  using ((signup_status = 'approved' and is_online) or public.is_owner_of(id));

-- Défense en profondeur, même principe que le contrôle d'abonnement déjà
-- en place juste au-dessus : la policy RLS empêche déjà un client de
-- DÉCOUVRIR un salon hors ligne, mais un appel direct à l'API ne doit pas
-- non plus pouvoir y créer une réservation en ligne. Le personnel/gérant
-- garde la main pour ses propres écritures manuelles (source != klant_app,
-- comme pour l'abonnement), et le bypass walk_in existant (0018) n'est
-- pas touché.
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
begin
  if new.source in ('blokkering', 'walk_in') then
    return new;
  end if;

  v_local_date := (new.start_time at time zone 'Africa/Kinshasa')::date;

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

-- Cohérence avec la policy businesses ci-dessus : une galerie photo ne doit
-- pas rester lisible publiquement pour un établissement passé hors ligne,
-- même si quelqu'un connaît déjà son business_id (ex. lien partagé) — même
-- règle de visibilité que la fiche établissement elle-même.
drop policy if exists "public_read_business_photos" on public.business_photos;
create policy "public_read_business_photos"
  on public.business_photos for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_photos.business_id
        and (
          (
            b.signup_status = 'approved'
            and b.is_online
            and (b.subscription_paid_until is null or now() <= b.subscription_paid_until + interval '1 month')
          )
          or public.is_owner_of(b.id)
        )
    )
  );
