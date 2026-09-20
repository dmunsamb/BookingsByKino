-- Scénarios "file d'attente sans rendez-vous" (module étendu, migration
-- 0033) — voir README.md. Ne modifie jamais la base (rollback systématique).
--
-- Fixture synthétique dédiée (pas Nouschka) : cette suite a besoin de
-- contrôler précisément l'état de la file (ouverte/fermée, capacité,
-- ordre d'arrivée), ce qui serait fragile sur un établissement pilote
-- avec de vraies données qui évoluent.

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

insert into businesses (id, name, main_category, categories, signup_status, is_online)
values ('66666666-6666-6666-6666-666666666601', 'TEST File Attente', 'beauty', array['Salon de beauté'], 'approved', true);

insert into services (id, business_id, name, duration_minutes, price_usd, deposit_usd)
values ('66666666-6666-6666-6666-666666666602', '66666666-6666-6666-6666-666666666601', 'Coupe', 30, 10, 5);

insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time, created_at)
values
  ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'walk_in', 'confirmed', 'Jean Dupont', '0810000001', now(), now() + interval '30 minutes', now() - interval '10 minutes'),
  ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'walk_in', 'confirmed', 'Marie Kabongo', '0810000002', now(), now() + interval '30 minutes', now() - interval '5 minutes'),
  ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'walk_in', 'confirmed', 'Paul', '0810000003', now(), now() + interval '30 minutes', now() - interval '1 minutes');

-- 1. Vue publique anonymisée : prénom + position, dans l'ordre d'arrivée
do $$
declare
  v_row record;
  v_names text := '';
begin
  set local role anon;
  for v_row in
    select first_name, position from walkin_queue_public
    where business_id = '66666666-6666-6666-6666-666666666601'
    order by position
  loop
    v_names := v_names || v_row.position || ':' || v_row.first_name || ',';
  end loop;
  reset role;
  if v_names = '1:Jean,2:Marie,3:Paul,' then
    insert into test_results values ('1_queue_publique_ordonnee', 'OK', v_names);
  else
    insert into test_results values ('1_queue_publique_ordonnee', 'BUG', v_names);
  end if;
end $$;

-- 2. Un "décalage" (queue_bumped_at) change bien l'ordre de la vue publique
do $$
declare
  v_id uuid;
  v_row record;
  v_names text := '';
begin
  select id into v_id from agenda_entries where business_id = '66666666-6666-6666-6666-666666666601' and client_name = 'Jean Dupont';
  update agenda_entries set queue_bumped_at = now() + interval '10 minutes', queue_shift_used = true where id = v_id;

  for v_row in
    select first_name, position from walkin_queue_public
    where business_id = '66666666-6666-6666-6666-666666666601'
    order by position
  loop
    v_names := v_names || v_row.position || ':' || v_row.first_name || ',';
  end loop;
  if v_names = '1:Marie,2:Paul,3:Jean,' then
    insert into test_results values ('2_decalage_change_ordre', 'OK', v_names);
  else
    insert into test_results values ('2_decalage_change_ordre', 'BUG', v_names);
  end if;
end $$;

-- 3. anon ne lit jamais agenda_entries directement (confidentialité inchangée)
do $$
declare v_visible boolean;
begin
  set local role anon;
  select exists(select 1 from agenda_entries where business_id = '66666666-6666-6666-6666-666666666601') into v_visible;
  reset role;
  if v_visible then
    insert into test_results values ('3_anon_ne_lit_pas_agenda_direct', 'BUG_TROU_DE_SECURITE', '');
  else
    insert into test_results values ('3_anon_ne_lit_pas_agenda_direct', 'OK', '');
  end if;
end $$;

-- 4. File fermée -> un nouveau ticket est refusé
update businesses set walkin_queue_open = false where id = '66666666-6666-6666-6666-666666666601';
do $$
begin
  set local role anon;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time)
  values ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'walk_in', 'confirmed', 'Nouveau', '0810000004', now(), now() + interval '30 minutes');
  reset role;
  insert into test_results values ('4_file_fermee_refuse', 'BUG_ACCEPTE', 'inséré malgré la file fermée');
exception when others then
  reset role;
  insert into test_results values ('4_file_fermee_refuse', 'OK_REJETE', sqlerrm);
end $$;

-- 5. File rouverte + capacité déjà atteinte (3) -> refusé
update businesses set walkin_queue_open = true, walkin_queue_capacity = 3 where id = '66666666-6666-6666-6666-666666666601';
do $$
begin
  set local role anon;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time)
  values ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'walk_in', 'confirmed', 'Trop', '0810000005', now(), now() + interval '30 minutes');
  reset role;
  insert into test_results values ('5_capacite_atteinte_refuse', 'BUG_ACCEPTE', 'inséré malgré la capacité atteinte');
exception when others then
  reset role;
  insert into test_results values ('5_capacite_atteinte_refuse', 'OK_REJETE', sqlerrm);
end $$;

-- 6. Capacité relevée à 4 -> accepté
update businesses set walkin_queue_capacity = 4 where id = '66666666-6666-6666-6666-666666666601';
do $$
begin
  set local role anon;
  insert into agenda_entries (business_id, service_id, source, status, client_name, client_phone, start_time, end_time)
  values ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'walk_in', 'confirmed', 'Quatrieme', '0810000006', now(), now() + interval '30 minutes');
  reset role;
  insert into test_results values ('6_capacite_relevee_accepte', 'OK', 'inséré');
exception when others then
  reset role;
  insert into test_results values ('6_capacite_relevee_accepte', 'BUG_REJETE', sqlerrm);
end $$;

-- 7. Prise en charge (staff_id) : le ticket sort de la vue publique (plus "en attente")
do $$
declare
  v_id uuid;
  v_staff_id uuid;
  v_still_visible boolean;
begin
  insert into staff_members (id, business_id, name, active)
  values ('66666666-6666-6666-6666-666666666699', '66666666-6666-6666-6666-666666666601', 'Coiffeuse Test', true)
  returning id into v_staff_id;

  select id into v_id from agenda_entries where business_id = '66666666-6666-6666-6666-666666666601' and client_name = 'Marie Kabongo';
  update agenda_entries set staff_id = v_staff_id where id = v_id;

  select exists(
    select 1 from walkin_queue_public
    where business_id = '66666666-6666-6666-6666-666666666601' and first_name = 'Marie'
  ) into v_still_visible;

  if v_still_visible then
    insert into test_results values ('7_prise_en_charge_sort_de_la_file', 'BUG', 'Marie visible malgré staff_id renseigné');
  else
    insert into test_results values ('7_prise_en_charge_sort_de_la_file', 'OK', '');
  end if;
end $$;

-- 8. La prise en charge (UPDATE) n'est jamais bloquée par une file fermée
-- ou une capacité atteinte (seul l'INSERT est gardé, voir 0033).
update businesses set walkin_queue_open = false where id = '66666666-6666-6666-6666-666666666601';
do $$
declare v_id uuid; v_rows int;
begin
  select id into v_id from agenda_entries where business_id = '66666666-6666-6666-6666-666666666601' and client_name = 'Paul';
  update agenda_entries set status = 'termine' where id = v_id;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    insert into test_results values ('8_update_non_bloque_par_file_fermee', 'OK', '');
  else
    insert into test_results values ('8_update_non_bloque_par_file_fermee', 'BUG', 'rows=' || v_rows);
  end if;
end $$;

select * from test_results order by step;

rollback;
