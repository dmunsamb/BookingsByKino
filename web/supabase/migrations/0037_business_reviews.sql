-- Avis clients (note + commentaire) sur la fiche établissement publique.
-- Sans compte client, la seule preuve qu'on a affaire à quelqu'un qui a
-- réellement été servi est la réservation elle-même : un avis n'est donc
-- accepté que pour une réservation dont le SERVICE A ÉTÉ RENDU
-- (status = 'termine'), identifiée par son numéro de suivi ET son numéro
-- de téléphone (les deux ensemble : un numéro de suivi seul seul est
-- trop facile à deviner puisqu'il est court et séquentiel). Publication
-- immédiate (décision produit), avec un droit de suppression pour le
-- gérant en cas d'avis abusif — pas de file de modération avant
-- publication.

create table public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agenda_entry_id uuid not null references public.agenda_entries(id) on delete cascade,
  client_name text,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (agenda_entry_id)
);

create index business_reviews_business_idx on public.business_reviews (business_id, created_at desc);

alter table public.business_reviews enable row level security;

-- Lecture publique (comme le catalogue) : n'importe qui peut voir les avis.
create policy "public_read_business_reviews"
  on public.business_reviews for select
  using (true);

-- Suppression réservée au gérant (avis abusif) — jamais d'update : un
-- avis modifié après coup perdrait sa valeur de preuve.
create policy "owner_delete_business_reviews"
  on public.business_reviews for delete
  using (public.is_owner_of(business_id));

-- Aucune policy INSERT pour anon/authenticated : la seule voie d'écriture
-- est submit_business_review ci-dessous (SECURITY DEFINER), qui vérifie
-- d'abord la correspondance réservation/téléphone/statut.
create or replace function public.submit_business_review(
  p_reference_number bigint,
  p_client_phone text,
  p_rating smallint,
  p_comment text
) returns table(ok boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
  v_phone_digits text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_inserted uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return query select false, 'Note invalide.';
    return;
  end if;

  if v_phone_digits = '' then
    return query select false, 'Veuillez indiquer le numéro utilisé pour la réservation.';
    return;
  end if;

  select id, business_id, client_name, client_phone, status
  into v_entry
  from public.agenda_entries
  where reference_number = p_reference_number
  limit 1;

  if v_entry.id is null then
    return query select false, 'Numéro de suivi introuvable.';
    return;
  end if;

  if regexp_replace(coalesce(v_entry.client_phone, ''), '\D', '', 'g') <> v_phone_digits then
    return query select false, 'Le numéro ne correspond pas à cette réservation.';
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

grant execute on function public.submit_business_review(bigint, text, smallint, text) to anon, authenticated;
