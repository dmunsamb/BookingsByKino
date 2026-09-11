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

-- 4. get_agenda_capacity doit refléter le blocage (booked_count = 999999) pour ces 2 créneaux
do $$
declare
  v_row record;
  v_ok boolean := true;
  v_seen int := 0;
begin
  for v_row in
    select * from get_agenda_capacity('8fa5d756-9910-46d7-9e3b-27521ef4e9da')
    where start_time in ('2026-09-14T12:00:00+01:00'::timestamptz, '2026-09-14T12:30:00+01:00'::timestamptz)
  loop
    v_seen := v_seen + 1;
    if v_row.booked_count <> 999999 then
      v_ok := false;
    end if;
  end loop;
  if v_ok and v_seen = 2 then
    insert into test_results values ('4_capacite_reflete_blocage', 'OK', '2 créneaux à 999999');
  else
    insert into test_results values ('4_capacite_reflete_blocage', 'BUG', 'vus=' || v_seen || ' ok=' || v_ok);
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
    insert into test_results values ('8_staff_voit_numero_masque', 'OK', v_display);
  else
    insert into test_results values ('8_staff_voit_numero_masque', 'BUG', 'obtenu: ' || coalesce(v_display, 'NULL'));
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
    insert into test_results values ('9_owner_voit_numero_complet', 'OK', v_display);
  else
    insert into test_results values ('9_owner_voit_numero_complet', 'BUG', 'obtenu: ' || coalesce(v_display, 'NULL'));
  end if;
end $$;

reset role;
update profiles set role = 'platform_admin' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

select * from test_results order by step;

rollback;
