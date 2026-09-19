-- Scénarios "photos" (business_photos, migration 0023) — voir README.md.
-- Ne modifie jamais la base (rollback systématique). Les colonnes
-- services.photo_url / staff_members.photo_url ne sont pas testées ici :
-- elles sont couvertes par les policies déjà existantes et testées
-- (owner_update_services / owner_update_staff_members), ajouter une
-- colonne ne change pas leur comportement.
--
-- Établissement pilote : Nouschka (8fa5d756-9910-46d7-9e3b-27521ef4e9da),
-- compte platform_admin Dino Munsamba
-- (0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad), temporairement basculé en
-- 'owner' le temps du test. Voir le piège des claims JWT documenté en
-- tête de 05_multi_business_staff_scenarios.sql (vider explicitement
-- request.jwt.claim.sub avant tout `set local role anon`).
--
-- Un deuxième établissement de test, non rattaché à Dino (TEST Salon C,
-- 77777777-7777-7777-7777-777777777777, pending_approval), sert à
-- vérifier qu'un gérant ne peut pas écrire dans la galerie d'un salon
-- qu'il ne possède pas.

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

insert into businesses (id, name, main_category, categories, signup_status, is_test)
values ('77777777-7777-7777-7777-777777777777', 'TEST Salon C', 'beauty', array['Salon de beauté'], 'pending_approval', true);

update profiles set role = 'owner' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

insert into business_photos (business_id, url, position)
values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'https://example.test/storage/v1/object/public/media/businesses/nouschka/1.jpg', 0);

-- 1. Le public (anon) doit voir la photo d'un salon approuvé (Nouschka) :
--    c'est la galerie affichée sur la page d'accueil et la fiche établissement.
do $$
declare
  v_count int;
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into v_count from business_photos where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da';
  reset role;
  if v_count = 1 then
    insert into test_results values ('1_anon_voit_photo_salon_approuve', 'OK', '');
  else
    insert into test_results values ('1_anon_voit_photo_salon_approuve', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

insert into business_photos (business_id, url, position)
values ('77777777-7777-7777-7777-777777777777', 'https://example.test/storage/v1/object/public/media/businesses/salonc/1.jpg', 0);

-- 2. Le public ne doit PAS voir la photo d'un salon en attente de validation.
do $$
declare
  v_count int;
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into v_count from business_photos where business_id = '77777777-7777-7777-7777-777777777777';
  reset role;
  if v_count = 0 then
    insert into test_results values ('2_anon_ne_voit_pas_photo_salon_pending', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('2_anon_ne_voit_pas_photo_salon_pending', 'BUG_TROU_DE_SECURITE', 'anon voit ' || v_count || ' ligne(s)');
  end if;
end $$;

-- 3. Le gérant de Nouschka peut ajouter une photo à SA galerie.
do $$
declare
  v_count int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  insert into business_photos (business_id, url, position)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'https://example.test/storage/v1/object/public/media/businesses/nouschka/2.jpg', 1);
  select count(*) into v_count from business_photos where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if v_count = 2 then
    insert into test_results values ('3_gerant_ajoute_photo_a_son_salon', 'OK', '');
  else
    insert into test_results values ('3_gerant_ajoute_photo_a_son_salon', 'BUG', 'trouvé=' || v_count || ' (attendu 2)');
  end if;
end $$;

-- 4. Le gérant de Nouschka ne peut PAS ajouter de photo au Salon C (pas le sien).
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  insert into business_photos (business_id, url, position)
  values ('77777777-7777-7777-7777-777777777777', 'https://example.test/storage/v1/object/public/media/businesses/salonc/intrus.jpg', 1);
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  insert into test_results values ('4_gerant_ne_peut_pas_ecrire_ailleurs', 'BUG_TROU_DE_SECURITE', 'insertion acceptée dans un salon qu''il ne possède pas');
exception when others then
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  insert into test_results values ('4_gerant_ne_peut_pas_ecrire_ailleurs', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 5. Un visiteur anonyme ne peut pas écrire dans une galerie, même celle
--    d'un salon approuvé et public en lecture.
do $$
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  insert into business_photos (business_id, url, position)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'https://example.test/storage/v1/object/public/media/businesses/nouschka/intrus.jpg', 9);
  reset role;
  insert into test_results values ('5_anon_ne_peut_pas_ecrire', 'BUG_TROU_DE_SECURITE', 'anon a pu insérer une photo');
exception when others then
  reset role;
  insert into test_results values ('5_anon_ne_peut_pas_ecrire', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

update profiles set role = 'platform_admin' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

select * from test_results order by step;

rollback;
