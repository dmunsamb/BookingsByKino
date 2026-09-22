-- Remplace la vérification "numéro de suivi + téléphone" (migrations 0037,
-- 0038) par un lien à usage unique par réservation : le gérant l'envoie
-- lui-même via WhatsApp après le service ("Service rendu"), le client n'a
-- plus rien à ressaisir pour prouver qu'il s'agit bien de sa réservation.
-- Décision produit : plus aucun bouton "Laisser un avis" sur la fiche
-- établissement publique, qui devient strictement en lecture seule.
--
-- gen_random_uuid() est une fonction volatile : Postgres calcule une
-- valeur différente pour CHAQUE ligne existante lors de cet ALTER (pas la
-- même partout), donc l'unicité ci-dessous est garantie dès la création
-- de la colonne, sans étape de backfill séparée.
alter table public.agenda_entries
  add column review_token uuid not null default gen_random_uuid();

create unique index agenda_entries_review_token_idx
  on public.agenda_entries (review_token);

-- Le gérant a besoin du jeton pour construire le lien envoyé au client.
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
  ae.queue_shift_used,
  ae.review_token
from public.agenda_entries ae
join public.profiles p on p.id = auth.uid()
left join public.staff_members sm on sm.id = ae.staff_id
where public.is_staff_of(ae.business_id);

-- Plus utilisés une fois le formulaire public retiré (voir
-- reviews-section.tsx) : normalize_congo_phone ne servait qu'à
-- submit_business_review.
drop function if exists public.submit_business_review(bigint, text, smallint, text);
drop function if exists public.normalize_congo_phone(text);

-- Lecture publique minimale pour la page /avis/[token] (anon, jamais
-- connecté) : juste de quoi afficher le bon message (lien invalide / pas
-- encore clôturé / déjà noté / formulaire), sans exposer le nom ou le
-- téléphone du client via cette voie.
create or replace function public.get_review_link_status(p_token uuid)
returns table(business_name text, status text, already_reviewed boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_entry record;
begin
  select ae.id, ae.status, ae.business_id
  into v_entry
  from public.agenda_entries ae
  where ae.review_token = p_token
  limit 1;

  if v_entry.id is null then
    return;
  end if;

  return query
    select
      b.name,
      v_entry.status,
      exists(
        select 1 from public.business_reviews r
        where r.agenda_entry_id = v_entry.id
      )
    from public.businesses b
    where b.id = v_entry.business_id;
end;
$$;

grant execute on function public.get_review_link_status(uuid) to anon, authenticated;

-- Seule voie d'écriture pour business_reviews maintenant : le jeton
-- prouve à lui seul qu'il s'agit de cette réservation précise (plus
-- besoin de revérifier téléphone/numéro de suivi).
create or replace function public.submit_business_review_by_token(
  p_token uuid,
  p_rating smallint,
  p_comment text
) returns table(ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_inserted uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return query select false, 'Note invalide.';
    return;
  end if;

  select id, business_id, client_name, status
  into v_entry
  from public.agenda_entries
  where review_token = p_token
  limit 1;

  if v_entry.id is null then
    return query select false, 'Lien invalide.';
    return;
  end if;

  if v_entry.status <> 'termine' then
    return query select false, 'Cette réservation n''a pas encore été clôturée par l''établissement.';
    return;
  end if;

  insert into public.business_reviews (business_id, agenda_entry_id, client_name, rating, comment)
  values (v_entry.business_id, v_entry.id, v_entry.client_name, p_rating, nullif(trim(coalesce(p_comment, '')), ''))
  on conflict (agenda_entry_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return query select false, 'Un avis a déjà été laissé pour cette réservation.';
    return;
  end if;

  return query select true, 'Avis publié, merci !';
end;
$$;

grant execute on function public.submit_business_review_by_token(uuid, smallint, text) to anon, authenticated;
