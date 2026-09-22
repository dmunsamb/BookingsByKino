-- Assouplit la vérification du numéro de téléphone pour un avis client
-- (migration 0037) : "081 234 5678" et "+243 81 234 5678" (ou "243...")
-- désignent le même numéro, mais ne matchaient pas tel quel (préfixe
-- local "0" vs indicatif pays "243"). On normalise les deux côtés vers
-- la forme locale à 10 chiffres avant de comparer.
create or replace function public.normalize_congo_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) = 12
      and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') like '243%'
    then '0' || substring(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') from 4)
    else regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  end;
$$;

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
  v_phone_normalized text := public.normalize_congo_phone(p_client_phone);
  v_inserted uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return query select false, 'Note invalide.';
    return;
  end if;

  if v_phone_normalized = '' then
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

  if public.normalize_congo_phone(v_entry.client_phone) <> v_phone_normalized then
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
