-- Scénarios "client" (visiteur anonyme, aucun compte) — voir README.md.
-- Ne modifie jamais la base : tout tourne dans une transaction annulée
-- (rollback) à la fin de chaque bloc.
--
-- Établissement pilote : Nouschka. Ajustez ces identifiants si besoin :
--   business_id = 8fa5d756-9910-46d7-9e3b-27521ef4e9da
--   service_id  = 1a4cf0c2-bfb7-436e-88b8-0755394e97a2 ("coupe homme pelouse", 20 min)
-- Horaires : sam 12/09/2026 = 11:00-20:00, capacité 3.
-- Les dates (12, 11/09/2026) doivent rester dans le futur proche par
-- rapport à aujourd'hui — à avancer périodiquement.

-- ============================================================
-- Réservation "avec RDV" : valide, jour-même refusé, capacité
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 1. Réservation valide pour demain
do $$
declare
  v_ref bigint;
begin
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Client A', '0810000001', '2026-09-12T11:00:00+01:00', '2026-09-12T11:20:00+01:00', v_ref);
  insert into test_results values ('1_booking_valide_demain', 'OK', 'ref=' || v_ref);
exception when others then
  insert into test_results values ('1_booking_valide_demain', 'ECHEC_INATTENDU', sqlerrm);
end $$;

-- 2. Réservation le jour même : doit être refusée
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Client Today', '0810000002', '2026-09-11T14:00:00+01:00', '2026-09-11T14:20:00+01:00', 999901);
  insert into test_results values ('2_booking_jour_meme', 'BUG_AURAIT_DU_ECHOUER', 'insert accepté à tort');
exception when others then
  insert into test_results values ('2_booking_jour_meme', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 3. Remplir les 2 places restantes du samedi 11:00 (capacité 3, 1 déjà prise par le test 1)
do $$
declare
  v_ref bigint;
begin
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Client B', '0810000003', '2026-09-12T11:00:00+01:00', '2026-09-12T11:20:00+01:00', v_ref);
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Client C', '0810000004', '2026-09-12T11:00:00+01:00', '2026-09-12T11:20:00+01:00', v_ref);
  insert into test_results values ('3_capacite_remplie', 'OK', 'capacité 3/3 atteinte');
exception when others then
  insert into test_results values ('3_capacite_remplie', 'ECHEC_INATTENDU', sqlerrm);
end $$;

-- 4. Un 4e client sur le même créneau (capacité 3) doit être refusé
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Client D', '0810000005', '2026-09-12T11:00:00+01:00', '2026-09-12T11:20:00+01:00', 999902);
  insert into test_results values ('4_capacite_depassee', 'BUG_AURAIT_DU_ECHOUER', 'insert accepté à tort');
exception when others then
  insert into test_results values ('4_capacite_depassee', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

select * from test_results order by step;

rollback;

-- ============================================================
-- Ticket "sans rendez-vous" : bypass total de la capacité + compteur
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 5. 4 tickets walk-in sur le même créneau (vendredi 14:00, capacité 2) : doivent tous réussir
do $$
declare
  v_ref bigint;
  i int;
  v_count int := 0;
begin
  for i in 1..4 loop
    select next_booking_reference() into v_ref;
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'walk_in', 'confirmed', 'TEST Walkin ' || i, '081000001' || i, '2026-09-11T14:00:00+01:00', '2026-09-11T14:20:00+01:00', v_ref);
    v_count := v_count + 1;
  end loop;
  insert into test_results values ('5_walkin_bypass_capacite', 'OK', v_count || ' tickets créés sur un créneau de capacité 2');
exception when others then
  insert into test_results values ('5_walkin_bypass_capacite', 'ECHEC_INATTENDU', sqlerrm);
end $$;

-- 6. Le compteur affiché au client doit refléter les 4 tickets créés
do $$
declare
  v_count int;
begin
  select count_walk_in_tickets_today('8fa5d756-9910-46d7-9e3b-27521ef4e9da') into v_count;
  if v_count = 4 then
    insert into test_results values ('6_compteur_file_walkin', 'OK', 'count=' || v_count);
  else
    insert into test_results values ('6_compteur_file_walkin', 'BUG', 'attendu=4, obtenu=' || v_count);
  end if;
end $$;

select * from test_results order by step;

rollback;

-- ============================================================
-- Garde-fous RLS : ce qu'un visiteur anonyme ne doit PAS pouvoir faire
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

set local role anon;

-- 7. Autorisé : demande "avec RDV" classique
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST RLS Client', '0840000001', '2026-09-12T14:00:00+01:00', '2026-09-12T14:20:00+01:00', 999910);
  insert into test_results values ('7_anon_klant_app_pending', 'OK_AUTORISE_COMME_ATTENDU', '');
exception when others then
  insert into test_results values ('7_anon_klant_app_pending', 'BUG_AURAIT_DU_PASSER', sqlerrm);
end $$;

-- 8. Refusé : forcer un statut confirmé sur une demande "avec RDV" (contournerait la validation du gérant)
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'confirmed', 'TEST RLS Bypass', '0840000002', '2026-09-12T14:30:00+01:00', '2026-09-12T14:50:00+01:00', 999911);
  insert into test_results values ('8_anon_klant_app_confirmed', 'BUG_TROU_DE_SECURITE', 'anon a pu forcer un statut confirmed');
exception when others then
  insert into test_results values ('8_anon_klant_app_confirmed', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 9. Autorisé : ticket walk-in confirmé (comportement voulu)
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'walk_in', 'confirmed', 'TEST RLS Walkin', '0840000003', '2026-09-11T14:00:00+01:00', '2026-09-11T14:20:00+01:00', 999912);
  insert into test_results values ('9_anon_walkin_confirmed', 'OK_AUTORISE_COMME_ATTENDU', '');
exception when others then
  insert into test_results values ('9_anon_walkin_confirmed', 'BUG_AURAIT_DU_PASSER', sqlerrm);
end $$;

-- 10. Refusé : réservation manuelle (réservée au personnel)
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST RLS Manuel', '0840000004', '2026-09-12T15:00:00+01:00', '2026-09-12T15:20:00+01:00', 999913);
  insert into test_results values ('10_anon_manuel', 'BUG_TROU_DE_SECURITE', 'anon a pu créer une réservation manuelle');
exception when others then
  insert into test_results values ('10_anon_manuel', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 11. Refusé : blocage de créneau
do $$
begin
  insert into agenda_entries (business_id, source, start_time, end_time)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'blokkering', '2026-09-15T12:00:00+01:00', '2026-09-15T12:30:00+01:00');
  insert into test_results values ('11_anon_blocage', 'BUG_TROU_DE_SECURITE', 'anon a pu créer un blocage');
exception when others then
  insert into test_results values ('11_anon_blocage', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 12. Refusé : lecture directe de l'agenda (noms/téléphones)
do $$
declare
  v_count int;
begin
  select count(*) into v_count from agenda_entries where business_id = '8fa5d756-9910-46d7-9e3b-27521ef4e9da';
  if v_count = 0 then
    insert into test_results values ('12_anon_ne_lit_pas_agenda', 'OK_AUCUNE_LIGNE_VISIBLE', 'count=' || v_count);
  else
    insert into test_results values ('12_anon_ne_lit_pas_agenda', 'BUG_TROU_DE_SECURITE', 'anon voit ' || v_count || ' lignes de l''agenda !');
  end if;
end $$;

reset role;

select * from test_results order by step;

rollback;

-- ============================================================
-- Recherche / filtre page d'accueil
-- ============================================================
-- `set local` n'a d'effet que dans une transaction explicite : sans le
-- begin/rollback ci-dessous, chaque instruction tournerait dans sa
-- propre transaction implicite et perdrait le rôle "anon" aussitôt.

begin;

set local role anon;

-- 13. Recherche par nom -> doit trouver Nouschka
select '13_search_nom' as test,
  (select count(*) from businesses where signup_status = 'approved'
    and (name ilike '%nouschka%' or sub_category ilike '%nouschka%' or coalesce(city,'') ilike '%nouschka%' or coalesce(address,'') ilike '%nouschka%')
  ) as trouves_attendu_1;

-- 14. Recherche par type (sous-catégorie) -> doit trouver Nouschka ("Beauté & Coiffure")
select '14_search_type' as test,
  (select count(*) from businesses where signup_status = 'approved'
    and (name ilike '%beauté%' or sub_category ilike '%beauté%' or coalesce(city,'') ilike '%beauté%' or coalesce(address,'') ilike '%beauté%')
  ) as trouves_attendu_1;

-- 15. Recherche sans correspondance -> doit renvoyer 0
select '15_search_inexistant' as test,
  (select count(*) from businesses where signup_status = 'approved'
    and (name ilike '%xyzabc123%' or sub_category ilike '%xyzabc123%' or coalesce(city,'') ilike '%xyzabc123%' or coalesce(address,'') ilike '%xyzabc123%')
  ) as trouves_attendu_0;

rollback;

-- ============================================================
-- Établissement inactif vs en grâce
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

insert into businesses (id, name, main_category, sub_category, signup_status, subscription_paid_until)
values ('22222222-2222-2222-2222-222222222222', 'TEST Salon Inactif', 'beauty', 'Salon de beauté', 'approved', now() - interval '20 days');

insert into services (id, business_id, name, duration_minutes, price_usd, deposit_usd)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Test Service', 30, 10, 5);

insert into availability_rules (business_id, weekday, start_time, end_time, slot_duration_minutes, capacity)
values ('22222222-2222-2222-2222-222222222222', extract(dow from '2026-09-12'::date)::int, '09:00', '17:00', 30, 5);

-- 16. Abonnement inactif depuis 20 jours (> 7 jours de grâce) : nouvelle demande refusée
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'klant_app', 'pending_approval', 'TEST Client Inactif', '0850000001', '2026-09-12T10:00:00+01:00', '2026-09-12T10:30:00+01:00', 999930);
  insert into test_results values ('16_booking_salon_inactif', 'BUG_TROU_DE_SECURITE', 'insert accepté malgré l''abonnement inactif');
exception when others then
  insert into test_results values ('16_booking_salon_inactif', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 17. Abonnement en retard de 3 jours (dans la grâce de 7 jours) : toujours réservable
update businesses set subscription_paid_until = now() - interval '3 days' where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  v_ref bigint;
begin
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'klant_app', 'pending_approval', 'TEST Client En Attente', '0850000002', '2026-09-12T10:00:00+01:00', '2026-09-12T10:30:00+01:00', v_ref);
  insert into test_results values ('17_booking_salon_en_grace', 'OK', 'toujours réservable pendant la grâce de 7 jours');
exception when others then
  insert into test_results values ('17_booking_salon_en_grace', 'BUG', sqlerrm);
end $$;

select * from test_results order by step;

rollback;
