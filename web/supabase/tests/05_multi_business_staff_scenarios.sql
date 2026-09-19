-- Scénarios "plusieurs salons par gérant" (business_owners, is_owner_of
-- étendu — migration 0021) et "équipe" (staff_members, agenda_entries.
-- staff_id — migrations 0021/0022) — voir README.md. Ne modifie jamais la
-- base (rollback systématique).
--
-- Établissement pilote : Nouschka (8fa5d756-9910-46d7-9e3b-27521ef4e9da),
-- compte platform_admin Dino Munsamba
-- (0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad), temporairement basculé en
-- 'owner' le temps du test (comme dans 04_audit_log_scenarios.sql) —
-- aucun profil "owner" réel n'existe encore en production au moment de
-- l'écriture de ce fichier.
--
-- Un deuxième établissement de test (TEST Salon B,
-- 66666666-6666-6666-6666-666666666666) sert à vérifier l'isolation
-- entre salons : Dino en devient d'abord seul propriétaire (le
-- rattachement à Nouschka n'arrive qu'après le scénario 9, exprès — voir
-- ce scénario) SANS que ce soit son établissement actif
-- (profiles.business_id reste Nouschka au départ), exactement le
-- scénario "gérant de plusieurs salons" visé.
--
-- Piège à connaître si vous modifiez ce fichier : `perform
-- set_config('request.jwt.claim.sub', ..., true)` est local à la
-- TRANSACTION, pas au rôle Postgres — un `reset role` seul ne l'efface
-- pas. Toujours vider explicitement le claim (chaîne vide) avant de
-- repasser en `anon`, sinon `auth.uid()` réutilise le dernier compte
-- authentifié malgré le changement de rôle (faux négatif de sécurité).
-- La lecture de agenda_entries_for_dashboard (security_invoker) a besoin
-- elle aussi d'un contexte authenticated + claim, sinon son
-- `join profiles on id = auth.uid()` ne trouve personne et renvoie 0
-- lignes même quand les données existent bel et bien.

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

insert into businesses (id, name, main_category, categories, signup_status, is_test)
values ('66666666-6666-6666-6666-666666666666', 'TEST Salon B', 'beauty', array['Salon de beauté'], 'pending_approval', true);

update profiles set role = 'owner' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

-- 1. Sans rattachement, Dino ne doit pas être reconnu propriétaire du Salon B.
do $$
declare
  v_is_owner boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select is_owner_of('66666666-6666-6666-6666-666666666666') into v_is_owner;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if v_is_owner is false then
    insert into test_results values ('1_pas_encore_proprietaire', 'OK_REJETE_COMME_ATTENDU', '');
  else
    insert into test_results values ('1_pas_encore_proprietaire', 'BUG_TROU_DE_SECURITE', 'is_owner_of=true avant tout rattachement');
  end if;
end $$;

insert into business_owners (business_id, profile_id)
values ('66666666-6666-6666-6666-666666666666', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad');

-- 2. is_owner_of() étendu : après rattachement via business_owners, Dino
--    est reconnu propriétaire du Salon B alors même que son établissement
--    actif (profiles.business_id) reste Nouschka — c'est exactement ce que
--    doit permettre le sélecteur "plusieurs salons" pour lister/rejoindre
--    un établissement non actif.
do $$
declare
  v_is_owner boolean;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select is_owner_of('66666666-6666-6666-6666-666666666666') into v_is_owner;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if v_is_owner is true then
    insert into test_results values ('2_proprietaire_via_business_owners', 'OK', '');
  else
    insert into test_results values ('2_proprietaire_via_business_owners', 'BUG', 'is_owner_of=false après rattachement');
  end if;
end $$;

-- 3. Conséquence directe : Dino peut lire le Salon B (pourtant encore
--    "pending_approval", donc invisible du public) sans l'avoir activé.
do $$
declare
  v_count int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from businesses where id = '66666666-6666-6666-6666-666666666666';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if v_count = 1 then
    insert into test_results values ('3_lit_salon_non_actif', 'OK', '');
  else
    insert into test_results values ('3_lit_salon_non_actif', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 4. Un visiteur anonyme ne doit pas voir le Salon B (pending_approval,
--    pas de propriétaire côté anon) : le catalogue public reste protégé.
do $$
declare
  v_count int;
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into v_count from businesses where id = '66666666-6666-6666-6666-666666666666';
  reset role;
  if v_count = 0 then
    insert into test_results values ('4_anon_ne_voit_pas_salon_pending', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('4_anon_ne_voit_pas_salon_pending', 'BUG_TROU_DE_SECURITE', 'anon voit ' || v_count || ' ligne(s)');
  end if;
end $$;

-- 5. business_owners : Dino lit son propre rattachement (un seul
--    établissement à ce stade, le Salon B) — quel que soit son rôle
--    courant (la policy est profile_id = auth.uid(), indépendante du rôle).
do $$
declare
  v_count int;
begin
  update profiles set role = 'staff' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from business_owners where profile_id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  update profiles set role = 'owner' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  if v_count = 1 then
    insert into test_results values ('5_lit_son_propre_rattachement', 'OK', '');
  else
    insert into test_results values ('5_lit_son_propre_rattachement', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 6. Un visiteur anonyme ne doit rien voir de business_owners.
do $$
declare
  v_count int;
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into v_count from business_owners;
  reset role;
  if v_count = 0 then
    insert into test_results values ('6_anon_ne_lit_pas_business_owners', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('6_anon_ne_lit_pas_business_owners', 'BUG_TROU_DE_SECURITE', 'anon voit ' || v_count || ' ligne(s)');
  end if;
end $$;

-- ============================================================
-- Équipe (staff_members)
-- ============================================================

do $$
declare
  v_staff_id uuid;
begin
  insert into staff_members (business_id, name)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'TEST Grâce')
  returning id into v_staff_id;
end $$;

-- 7. Le gérant (is_staff_of via profiles.business_id = Nouschka, rôle
--    owner) voit bien le membre d'équipe qu'il vient de créer.
do $$
declare
  v_count int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from staff_members
  where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da' and name = 'TEST Grâce';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if v_count = 1 then
    insert into test_results values ('7_gerant_voit_son_equipe', 'OK', '');
  else
    insert into test_results values ('7_gerant_voit_son_equipe', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 8. Un visiteur anonyme ne doit ni lire ni écrire staff_members.
do $$
declare
  v_count int;
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into v_count from staff_members where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da';
  reset role;
  if v_count = 0 then
    insert into test_results values ('8a_anon_ne_lit_pas_equipe', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('8a_anon_ne_lit_pas_equipe', 'BUG_TROU_DE_SECURITE', 'anon voit ' || v_count || ' ligne(s)');
  end if;
end $$;

do $$
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  insert into staff_members (business_id, name) values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'TEST Intrus');
  reset role;
  insert into test_results values ('8b_anon_ne_peut_pas_ecrire_equipe', 'BUG_TROU_DE_SECURITE', 'anon a pu insérer un membre d''équipe');
exception when others then
  reset role;
  insert into test_results values ('8b_anon_ne_peut_pas_ecrire_equipe', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 9. Isolation entre salons : un membre du personnel simple (role staff,
--    donc pas platform_admin) dont l'établissement actif est le Salon B
--    ne doit PAS voir l'équipe de Nouschka. À ce stade Dino n'a encore
--    aucun rattachement business_owners avec Nouschka (seulement avec le
--    Salon B) : c'est volontaire, pour tester un cas d'isolation "propre"
--    avant d'ajouter ce second rattachement juste après pour le
--    scénario 10.
do $$
declare
  v_count int;
begin
  update profiles set role = 'staff', business_id = '66666666-6666-6666-6666-666666666666'
  where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from staff_members where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  update profiles set role = 'owner', business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da'
  where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  if v_count = 0 then
    insert into test_results values ('9_staff_isole_entre_salons', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('9_staff_isole_entre_salons', 'BUG_TROU_DE_SECURITE', 'staff du Salon B voit ' || v_count || ' ligne(s) de Nouschka');
  end if;
end $$;

-- Dino devient maintenant aussi propriétaire enregistré de Nouschka (son
-- deuxième salon, du point de vue du test) — uniquement à partir d'ici,
-- pour le scénario 10.
insert into business_owners (business_id, profile_id)
values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad');

-- 10. Mais le PROPRIÉTAIRE des deux salons, lui, doit pouvoir lire
--     l'équipe de Nouschka même avec le Salon B comme établissement actif
--     (is_owner_of étendu, policy de la migration 0022) — c'est ce qui
--     permettra au sélecteur de gérer plusieurs salons sans changer
--     d'onglet actif à chaque action.
--
--     Filtré sur "TEST Grâce" plutôt qu'un count(*) global : Nouschka a
--     depuis accumulé de vrais membres d'équipe (Metty, Shanayah,
--     Alaiah...) au fil du pilote, un compte total figé casserait ce test
--     à chaque ajout réel sans rapport avec ce qui est testé ici.
do $$
declare
  v_count int;
begin
  update profiles set business_id = '66666666-6666-6666-6666-666666666666'
  where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from staff_members
  where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da' and name = 'TEST Grâce';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  update profiles set business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da'
  where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  if v_count = 1 then
    insert into test_results values ('10_proprietaire_lit_salon_non_actif', 'OK', '');
  else
    insert into test_results values ('10_proprietaire_lit_salon_non_actif', 'BUG', 'trouvé=' || v_count || ' (attendu 1)');
  end if;
end $$;

-- ============================================================
-- Assignation d'un membre d'équipe à une réservation (agenda_entries.staff_id)
-- ============================================================

-- 11. L'assignation est purement informative : elle n'affecte pas
--     enforce_agenda_capacity (aucune vérification de capacité par
--     personne). Une réservation manuelle avec staff_id renseigné doit
--     s'insérer normalement et son staff_name doit se résoudre dans
--     agenda_entries_for_dashboard.
do $$
declare
  v_staff_id uuid;
  v_count int;
begin
  select id into v_staff_id from staff_members
  where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da' and name = 'TEST Grâce';

  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number, staff_id)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Cliente Equipe', '0860000099', '2026-09-14T15:00:00+01:00', '2026-09-14T15:20:00+01:00', 999950, v_staff_id);

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from agenda_entries_for_dashboard
  where reference_number = 999950 and staff_name = 'TEST Grâce';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if v_count = 1 then
    insert into test_results values ('11_assignation_visible_dans_la_vue', 'OK', 'staff_name correctement résolu dans agenda_entries_for_dashboard');
  else
    insert into test_results values ('11_assignation_visible_dans_la_vue', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 12. Désactiver ou supprimer un membre d'équipe ne doit jamais casser une
--     réservation existante (on delete set null, pas cascade).
do $$
declare
  v_staff_id uuid;
  v_count_after int;
begin
  select id into v_staff_id from staff_members
  where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da' and name = 'TEST Grâce';

  delete from staff_members where id = v_staff_id;

  select count(*) into v_count_after from agenda_entries where reference_number = 999950;
  if v_count_after = 1 then
    insert into test_results values ('12_suppression_equipe_ne_casse_pas_reservation', 'OK', 'réservation toujours présente après suppression du membre d''équipe');
  else
    insert into test_results values ('12_suppression_equipe_ne_casse_pas_reservation', 'BUG', 'réservation disparue (count=' || v_count_after || ')');
  end if;
end $$;

update profiles set role = 'platform_admin', business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da'
where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

select * from test_results order by step;

rollback;
