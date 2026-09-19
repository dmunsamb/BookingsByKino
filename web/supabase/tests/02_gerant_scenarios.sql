-- Scénarios "gérant / personnel" (compte authentifié, is_staff_of vrai)
-- — voir README.md. Ne modifie jamais la base (rollback systématique).
--
-- Établissement pilote : Nouschka (8fa5d756-9910-46d7-9e3b-27521ef4e9da),
-- service "coupe homme pelouse" (1a4cf0c2-bfb7-436e-88b8-0755394e97a2,
-- 20 min), compte platform_admin Dino Munsamba
-- (0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad) — traité par is_staff_of/
-- is_owner_of comme propriétaire universel, donc représentatif d'un
-- gérant/personnel classique pour ces tests de permissions.

-- ============================================================
-- Réservation manuelle (rendez-vous pris par téléphone)
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 1. Autorisé aujourd'hui (contrairement au client) : 2 réservations manuelles, capacité 2 (ven. 15:00)
do $$
declare
  v_ref bigint;
begin
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Manuel A', '0820000001', '2026-09-11T15:00:00+01:00', '2026-09-11T15:20:00+01:00', v_ref);
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Manuel B', '0820000002', '2026-09-11T15:00:00+01:00', '2026-09-11T15:20:00+01:00', v_ref);
  insert into test_results values ('1_manuel_aujourdhui_ok', 'OK', '2 réservations créées aujourd''hui, capacité 2/2');
exception when others then
  insert into test_results values ('1_manuel_aujourdhui_ok', 'ECHEC_INATTENDU', sqlerrm);
end $$;

-- 2. Une 3e sur le même créneau (capacité 2) doit être refusée
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Manuel C', '0820000003', '2026-09-11T15:00:00+01:00', '2026-09-11T15:20:00+01:00', 999903);
  insert into test_results values ('2_manuel_capacite_depassee', 'BUG_AURAIT_DU_ECHOUER', 'insert accepté à tort');
exception when others then
  insert into test_results values ('2_manuel_capacite_depassee', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

select * from test_results order by step;

rollback;

-- ============================================================
-- Blocage de créneaux (congé, indisponibilité)
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 3. Blocage lundi 14/09 12:00-13:00 (règle lundi 09:00-17:00, créneaux 30 min) -> 2 lignes générées
do $$
declare
  v_group uuid := gen_random_uuid();
  v_count int;
begin
  insert into agenda_entries (business_id, source, block_group_id, start_time, end_time)
  values
    ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'blokkering', v_group, '2026-09-14T12:00:00+01:00', '2026-09-14T12:30:00+01:00'),
    ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'blokkering', v_group, '2026-09-14T12:30:00+01:00', '2026-09-14T13:00:00+01:00');
  select count(*) into v_count from agenda_entries where block_group_id = v_group;
  if v_count = 2 then
    insert into test_results values ('3_blocage_cree', 'OK', v_count || ' lignes créées');
  else
    insert into test_results values ('3_blocage_cree', 'BUG', 'attendu 2 lignes, obtenu ' || v_count);
  end if;
exception when others then
  insert into test_results values ('3_blocage_cree', 'ECHEC_INATTENDU', sqlerrm);
end $$;

-- 4. Depuis 0027, get_agenda_capacity ne reflète plus les blocages (le
--    flag 999999 de 0018 bloquait TOUT le monde, incompatible avec un
--    blocage visant un seul membre) — elle ne compte que les vraies
--    réservations (status in (...)), donc aucune ligne pour ces horaires
--    purement bloqués (les lignes "blokkering" ont status NULL). Le rejet
--    de la réservation reste vérifié par les tests 5/6 et la section
--    dédiée plus bas.
do $$
declare
  v_seen int;
begin
  select count(*) into v_seen
  from get_agenda_capacity('8fa5d756-9910-46d7-9e3b-27521ef4e9da')
  where start_time in ('2026-09-14T12:00:00+01:00'::timestamptz, '2026-09-14T12:30:00+01:00'::timestamptz);
  if v_seen = 0 then
    insert into test_results values ('4_capacite_ignore_le_blocage', 'OK', 'aucune ligne renvoyée pour ces créneaux');
  else
    insert into test_results values ('4_capacite_ignore_le_blocage', 'BUG', 'vus=' || v_seen || ' (attendu 0)');
  end if;
end $$;

-- 5. Une réservation cliente sur le créneau bloqué doit être refusée AU NIVEAU DU TRIGGER
--    (pas seulement masquée côté liste de créneaux) — c'est le bug trouvé le 2026-09-11,
--    corrigé par la migration 0019. Si ce test repasse au rouge, la régression est revenue.
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Client Bloque', '0830000001', '2026-09-14T12:00:00+01:00', '2026-09-14T12:20:00+01:00', 999904);
  insert into test_results values ('5_booking_sur_creneau_bloque', 'REGRESSION_BUG_0019', 'insert accepté malgré le blocage !');
exception when others then
  insert into test_results values ('5_booking_sur_creneau_bloque', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 6. Idem pour une réservation manuelle sur le même créneau bloqué
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Manuel Bloque', '0830000002', '2026-09-14T12:00:00+01:00', '2026-09-14T12:20:00+01:00', 999905);
  insert into test_results values ('6_manuel_sur_creneau_bloque', 'REGRESSION_BUG_0019', 'insert accepté malgré le blocage !');
exception when others then
  insert into test_results values ('6_manuel_sur_creneau_bloque', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 7. Un walk-in reste possible même sur un créneau bloqué (bypass volontaire, c'est une file d'attente)
do $$
declare
  v_ref bigint;
begin
  select next_booking_reference() into v_ref;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'walk_in', 'confirmed', 'TEST Walkin Bloque', '0830000003', '2026-09-14T12:00:00+01:00', '2026-09-14T12:20:00+01:00', v_ref);
  insert into test_results values ('7_walkin_toujours_possible_sur_bloque', 'OK', 'comportement voulu');
exception when others then
  insert into test_results values ('7_walkin_toujours_possible_sur_bloque', 'REGRESSION', sqlerrm);
end $$;

select * from test_results order by step;

rollback;

-- ============================================================
-- Blocage par membre de l'équipe (0027_staff_aware_blocking.sql)
-- ============================================================
--
-- Nouschka est fermée le dimanche (aucune availability_rules existante
-- ce jour-là) : on y crée deux règles temporaires, une par membre, pour
-- isoler ce scénario de la capacité déjà configurée les autres jours.

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

do $$
declare
  v_staff_a uuid := gen_random_uuid();
  v_staff_b uuid := gen_random_uuid();
  v_group uuid;
  v_ref bigint;
begin
  insert into staff_members (id, business_id, name)
  values
    (v_staff_a, '8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'TEST Membre A'),
    (v_staff_b, '8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'TEST Membre B');

  insert into availability_rules (business_id, staff_id, weekday, start_time, end_time, slot_duration_minutes, capacity)
  values
    ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', v_staff_a, 0, '10:00', '12:00', 30, 1),
    ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', v_staff_b, 0, '10:00', '12:00', 30, 1);

  -- 10. Sans blocage, dimanche 13/09 10:00 : capacité totale 2 (A+B) —
  --     deux réservations doivent passer, une 3e doit être refusée.
  begin
    select next_booking_reference() into v_ref;
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Dim A', '0840000001', '2026-09-13T10:00:00+01:00', '2026-09-13T10:20:00+01:00', v_ref);
    select next_booking_reference() into v_ref;
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Dim B', '0840000002', '2026-09-13T10:00:00+01:00', '2026-09-13T10:20:00+01:00', v_ref);
    insert into test_results values ('8_somme_des_membres_ok', 'OK', '2 réservations acceptées (capacité 1+1)');
  exception when others then
    insert into test_results values ('8_somme_des_membres_ok', 'BUG', sqlerrm);
  end;

  begin
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Dim C', '0840000003', '2026-09-13T10:00:00+01:00', '2026-09-13T10:20:00+01:00', 999906);
    insert into test_results values ('9_troisieme_refusee', 'BUG_AURAIT_DU_ECHOUER', 'insert accepté à tort (capacité 2/2 déjà atteinte)');
  exception when others then
    insert into test_results values ('9_troisieme_refusee', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
  end;

  -- 12. Un blocage du seul membre A à 11:00 ne doit PAS empêcher une
  --     réservation à 11:00 (le membre B, non bloqué, reste disponible).
  v_group := gen_random_uuid();
  insert into agenda_entries (business_id, source, block_group_id, staff_id, start_time, end_time)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'blokkering', v_group, v_staff_a, '2026-09-13T11:00:00+01:00', '2026-09-13T11:30:00+01:00');

  begin
    select next_booking_reference() into v_ref;
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Dim D', '0840000004', '2026-09-13T11:00:00+01:00', '2026-09-13T11:20:00+01:00', v_ref);
    insert into test_results values ('10_membre_b_dispo_malgre_blocage_a', 'OK', 'réservation acceptée malgré A bloqué (B reste dispo)');
  exception when others then
    insert into test_results values ('10_membre_b_dispo_malgre_blocage_a', 'BUG', sqlerrm);
  end;

  -- 13. Une 2e réservation à 11:00 doit maintenant être refusée : A est
  --     bloqué, B est déjà pris, capacité effective 0.
  begin
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Dim E', '0840000005', '2026-09-13T11:00:00+01:00', '2026-09-13T11:20:00+01:00', 999907);
    insert into test_results values ('11_plus_personne_dispo_a_11h', 'BUG_AURAIT_DU_ECHOUER', 'insert accepté à tort');
  exception when others then
    insert into test_results values ('11_plus_personne_dispo_a_11h', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
  end;

  -- 14. Un blocage "toute l'équipe" (staff_id NULL) à 11:30 doit refuser
  --     tout le monde, y compris un membre non explicitement cité.
  insert into agenda_entries (business_id, source, block_group_id, staff_id, start_time, end_time)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'blokkering', gen_random_uuid(), null, '2026-09-13T11:30:00+01:00', '2026-09-13T12:00:00+01:00');

  begin
    insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
    values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'manueel', 'confirmed', 'TEST Dim F', '0840000006', '2026-09-13T11:30:00+01:00', '2026-09-13T11:50:00+01:00', 999908);
    insert into test_results values ('12_blocage_toute_equipe_bloque_tous', 'BUG_AURAIT_DU_ECHOUER', 'insert accepté à tort');
  exception when others then
    insert into test_results values ('12_blocage_toute_equipe_bloque_tous', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
  end;
end $$;

select * from test_results order by step;

rollback;

-- ============================================================
-- Confidentialité du téléphone client (BR-8) — vue agenda_entries_for_dashboard
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Masking', '0899887766', '2026-09-12T16:00:00+01:00', '2026-09-12T16:20:00+01:00', 999920);

-- 8. Un rôle "staff" doit voir un numéro masqué
update profiles set role = 'staff' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
set local role authenticated;
select set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);

do $$
declare
  v_display text;
begin
  select client_phone_display into v_display from agenda_entries_for_dashboard where reference_number = 999920;
  if v_display = '089 *** 66' then
    insert into test_results values ('13_staff_voit_numero_masque', 'OK', v_display);
  else
    insert into test_results values ('13_staff_voit_numero_masque', 'BUG', 'obtenu: ' || coalesce(v_display, 'NULL'));
  end if;
end $$;

reset role;

-- 9. Un rôle "owner" doit voir le numéro complet
update profiles set role = 'owner' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
set local role authenticated;
select set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);

do $$
declare
  v_display text;
begin
  select client_phone_display into v_display from agenda_entries_for_dashboard where reference_number = 999920;
  if v_display = '0899887766' then
    insert into test_results values ('14_owner_voit_numero_complet', 'OK', v_display);
  else
    insert into test_results values ('14_owner_voit_numero_complet', 'BUG', 'obtenu: ' || coalesce(v_display, 'NULL'));
  end if;
end $$;

reset role;
update profiles set role = 'platform_admin' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

select * from test_results order by step;

rollback;
