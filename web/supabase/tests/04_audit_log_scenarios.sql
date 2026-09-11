-- Scénarios "journal d'audit" (audit_log, migration 0020) — voir
-- README.md. Ne modifie jamais la base (rollback systématique).
--
-- Établissement pilote : Nouschka (8fa5d756-9910-46d7-9e3b-27521ef4e9da),
-- service "coupe homme pelouse" (1a4cf0c2-bfb7-436e-88b8-0755394e97a2),
-- compte platform_admin Dino Munsamba
-- (0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad).

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 1. Une réservation créée par un client (anon) doit générer une ligne "booking_created"
--    — c'est le scénario concret qui a motivé ce journal : preuve horodatée que la
--    plateforme a bien reçu la demande, indépendamment de ce qu'en a fait le salon ensuite.
set local role anon;
do $$
begin
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, reference_number)
  values ('8fa5d756-9910-46d7-9e3b-27521ef4e9da', '1a4cf0c2-bfb7-436e-88b8-0755394e97a2', 'klant_app', 'pending_approval', 'TEST Audit Client', '0860000001', '2026-09-12T13:00:00+01:00', '2026-09-12T13:20:00+01:00', 999940);
end $$;
reset role;

do $$
declare
  v_count int;
begin
  select count(*) into v_count from audit_log
  where entity_table = 'agenda_entries' and action = 'booking_created'
    and (new_value->>'reference_number')::bigint = 999940;
  if v_count = 1 then
    insert into test_results values ('1_booking_created_logue', 'OK', 'preuve de réception horodatée trouvée');
  else
    insert into test_results values ('1_booking_created_logue', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 2. Changement de statut (validation par le gérant) -> "booking_status_changed"
do $$
declare
  v_id uuid;
  v_count int;
begin
  select id into v_id from agenda_entries where reference_number = 999940;
  update agenda_entries set status = 'confirmed' where id = v_id;
  select count(*) into v_count from audit_log
  where entity_id = v_id and action = 'booking_status_changed'
    and old_value->>'status' = 'pending_approval' and new_value->>'status' = 'confirmed';
  if v_count = 1 then
    insert into test_results values ('2_status_change_logue', 'OK', '');
  else
    insert into test_results values ('2_status_change_logue', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 3. Approbation d'un salon -> "business_signup_status_changed"
do $$
declare
  v_count int;
begin
  insert into businesses (id, name, main_category, sub_category, signup_status)
  values ('44444444-4444-4444-4444-444444444444', 'TEST Audit Salon', 'beauty', 'Salon de beauté', 'pending_approval');
  update businesses set signup_status = 'approved' where id = '44444444-4444-4444-4444-444444444444';
  select count(*) into v_count from audit_log
  where entity_id = '44444444-4444-4444-4444-444444444444' and action = 'business_signup_status_changed'
    and old_value->>'signup_status' = 'pending_approval' and new_value->>'signup_status' = 'approved';
  if v_count = 1 then
    insert into test_results values ('3_approbation_salon_loguee', 'OK', '');
  else
    insert into test_results values ('3_approbation_salon_loguee', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 4. Changement de date d'abonnement -> "subscription_paid_until_changed"
do $$
declare
  v_count int;
begin
  update businesses set subscription_paid_until = now() + interval '1 month'
  where id = '44444444-4444-4444-4444-444444444444';
  select count(*) into v_count from audit_log
  where entity_id = '44444444-4444-4444-4444-444444444444' and action = 'subscription_paid_until_changed';
  if v_count = 1 then
    insert into test_results values ('4_abonnement_change_logue', 'OK', '');
  else
    insert into test_results values ('4_abonnement_change_logue', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 5. Changement de rôle d'un profil -> "profile_role_changed"
do $$
declare
  v_count int;
begin
  update profiles set role = 'staff' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  update profiles set role = 'platform_admin' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  select count(*) into v_count from audit_log
  where entity_id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad' and action = 'profile_role_changed';
  if v_count = 2 then
    insert into test_results values ('5_changement_role_logue', 'OK', '2 changements tracés (owner->staff->platform_admin)');
  else
    insert into test_results values ('5_changement_role_logue', 'BUG', 'trouvé=' || v_count || ' (attendu 2)');
  end if;
end $$;

-- 6. Suppression d'un service -> "service_deleted" avec le détail conservé dans old_value
do $$
declare
  v_count int;
begin
  insert into services (id, business_id, name, duration_minutes, price_usd, deposit_usd)
  values ('55555555-5555-5555-5555-555555555555', '8fa5d756-9910-46d7-9e3b-27521ef4e9da', 'TEST Service A Supprimer', 30, 20, 5);
  delete from services where id = '55555555-5555-5555-5555-555555555555';
  select count(*) into v_count from audit_log
  where entity_id = '55555555-5555-5555-5555-555555555555' and action = 'service_deleted'
    and old_value->>'name' = 'TEST Service A Supprimer' and (old_value->>'price_usd')::numeric = 20;
  if v_count = 1 then
    insert into test_results values ('6_suppression_service_loguee', 'OK', 'détail du service supprimé conservé');
  else
    insert into test_results values ('6_suppression_service_loguee', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 7. Suppression d'un horaire -> "availability_rule_deleted"
do $$
declare
  v_rule_id uuid;
  v_count int;
begin
  insert into availability_rules (id, business_id, weekday, start_time, end_time, slot_duration_minutes, capacity)
  values (gen_random_uuid(), '8fa5d756-9910-46d7-9e3b-27521ef4e9da', 0, '10:00', '12:00', 30, 1)
  returning id into v_rule_id;
  delete from availability_rules where id = v_rule_id;
  select count(*) into v_count from audit_log
  where entity_id = v_rule_id and action = 'availability_rule_deleted';
  if v_count = 1 then
    insert into test_results values ('7_suppression_horaire_loguee', 'OK', '');
  else
    insert into test_results values ('7_suppression_horaire_loguee', 'BUG', 'trouvé=' || v_count);
  end if;
end $$;

-- 8. Un visiteur anonyme ne doit RIEN voir du journal (confidentialité)
do $$
declare
  v_count int;
begin
  set local role anon;
  select count(*) into v_count from audit_log;
  reset role;
  if v_count = 0 then
    insert into test_results values ('8_anon_ne_lit_pas_audit', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('8_anon_ne_lit_pas_audit', 'BUG_TROU_DE_SECURITE', 'anon voit ' || v_count || ' lignes');
  end if;
end $$;

-- 9. Un gérant (owner, pas platform_admin) ne doit pas non plus lire le journal
do $$
declare
  v_count int;
begin
  update profiles set role = 'owner' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select count(*) into v_count from audit_log;
  reset role;
  update profiles set role = 'platform_admin' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  if v_count = 0 then
    insert into test_results values ('9_owner_ne_lit_pas_audit', 'OK_AUCUNE_LIGNE_VISIBLE', '');
  else
    insert into test_results values ('9_owner_ne_lit_pas_audit', 'BUG_TROU_DE_SECURITE', 'un gérant voit ' || v_count || ' lignes');
  end if;
end $$;

-- 10. Personne ne doit pouvoir appeler write_audit_log directement (forger une entrée)
do $$
begin
  set local role anon;
  perform write_audit_log('fake_action', 'businesses', gen_random_uuid(), null, null, null);
  reset role;
  insert into test_results values ('10_anon_ne_peut_pas_forger', 'BUG_TROU_DE_SECURITE', 'anon a pu appeler write_audit_log directement');
exception when others then
  reset role;
  insert into test_results values ('10_anon_ne_peut_pas_forger', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 11. Personne ne doit pouvoir modifier ou supprimer une ligne existante (immuabilité).
--     Sans policy UPDATE/DELETE, Postgres peut soit lever une erreur, soit
--     silencieusement affecter 0 ligne (RLS filtre avant l'écriture) — on
--     vérifie donc l'état réel après coup plutôt que de compter sur une
--     exception, pour ne pas rater un "faux négatif" silencieux.
do $$
declare
  v_id bigint;
  v_action_before text;
  v_action_after text;
  v_count_after int;
begin
  select id, action into v_id, v_action_before
  from audit_log where entity_table = 'agenda_entries' and (new_value->>'reference_number')::bigint = 999940
  limit 1;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  begin
    update audit_log set action = 'falsifie' where id = v_id;
  exception when others then
    null; -- une erreur ici est aussi un résultat acceptable, vérifié ci-dessous de toute façon
  end;
  reset role;

  select action into v_action_after from audit_log where id = v_id;
  if v_action_after = v_action_before then
    insert into test_results values ('11a_platform_admin_ne_peut_pas_modifier', 'OK_AUCUNE_MODIFICATION', 'action toujours = ' || v_action_after);
  else
    insert into test_results values ('11a_platform_admin_ne_peut_pas_modifier', 'BUG_TROU_DE_SECURITE', 'action changée en ' || v_action_after);
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  begin
    delete from audit_log where id = v_id;
  exception when others then
    null;
  end;
  reset role;

  select count(*) into v_count_after from audit_log where id = v_id;
  if v_count_after = 1 then
    insert into test_results values ('11b_platform_admin_ne_peut_pas_supprimer', 'OK_TOUJOURS_PRESENT', '');
  else
    insert into test_results values ('11b_platform_admin_ne_peut_pas_supprimer', 'BUG_TROU_DE_SECURITE', 'ligne supprimée (count=' || v_count_after || ')');
  end if;
end $$;

select * from test_results order by step;

rollback;
