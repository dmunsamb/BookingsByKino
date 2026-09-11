-- Scénarios "administrateur plateforme" (platform_admin) — voir README.md.
-- Ne modifie jamais la base (rollback systématique).
--
-- Compte platform_admin : Dino Munsamba
-- (0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad).

-- ============================================================
-- Inscription, approbation, abonnement, paiements
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 1. Nouvelle inscription -> pending_approval, invisible du catalogue public
insert into businesses (id, name, main_category, sub_category, signup_status, owner_email)
values ('11111111-1111-1111-1111-111111111111', 'TEST Salon Pending', 'beauty', 'Salon de beauté', 'pending_approval', 'test@example.com');

do $$
declare
  v_visible boolean;
begin
  set local role anon;
  select exists(select 1 from businesses where id = '11111111-1111-1111-1111-111111111111') into v_visible;
  reset role;
  if v_visible then
    insert into test_results values ('1_pending_invisible_public', 'BUG_TROU_DE_SECURITE', 'un salon pending_approval est visible du public');
  else
    insert into test_results values ('1_pending_invisible_public', 'OK', 'invisible comme attendu');
  end if;
end $$;

-- 2. Approbation (1 mois) : approved + subscription_paid_until = now + 1 mois, paiement tracé
do $$
declare
  v_paid_until timestamptz;
begin
  update businesses
  set signup_status = 'approved', subscription_paid_until = now() + interval '1 month'
  where id = '11111111-1111-1111-1111-111111111111'
  returning subscription_paid_until into v_paid_until;

  insert into subscription_payments (business_id, amount_usd, duration_months, recorded_by)
  values ('11111111-1111-1111-1111-111111111111', 15.00, 1, '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad');

  if v_paid_until between now() + interval '29 days' and now() + interval '32 days' then
    insert into test_results values ('2_approbation_1_mois', 'OK', 'paid_until=' || v_paid_until);
  else
    insert into test_results values ('2_approbation_1_mois', 'BUG', 'paid_until=' || v_paid_until);
  end if;
end $$;

-- 3. Visible du public une fois approuvé
do $$
declare
  v_visible boolean;
begin
  set local role anon;
  select exists(select 1 from businesses where id = '11111111-1111-1111-1111-111111111111') into v_visible;
  reset role;
  if v_visible then
    insert into test_results values ('3_approuve_visible_public', 'OK', '');
  else
    insert into test_results values ('3_approuve_visible_public', 'BUG', 'toujours invisible après approbation');
  end if;
end $$;

-- 4. Renouvellement (3 mois) anticipé (abonnement encore actif) : prolonge DEPUIS la date déjà payée
do $$
declare
  v_base timestamptz;
  v_new timestamptz;
begin
  select subscription_paid_until into v_base from businesses where id = '11111111-1111-1111-1111-111111111111';

  update businesses
  set subscription_paid_until = v_base + interval '3 months'
  where id = '11111111-1111-1111-1111-111111111111'
  returning subscription_paid_until into v_new;

  insert into subscription_payments (business_id, amount_usd, duration_months, recorded_by)
  values ('11111111-1111-1111-1111-111111111111', 40.00, 3, '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad');

  if v_new = v_base + interval '3 months' then
    insert into test_results values ('4_renouvellement_depuis_date_future', 'OK', 'ancien=' || v_base || ' nouveau=' || v_new);
  else
    insert into test_results values ('4_renouvellement_depuis_date_future', 'BUG', '');
  end if;
end $$;

-- 5. Historique des paiements : 2 lignes tracées, total correct
do $$
declare
  v_count int;
  v_total numeric;
begin
  select count(*), sum(amount_usd) into v_count, v_total
  from subscription_payments where business_id = '11111111-1111-1111-1111-111111111111';
  if v_count = 2 and v_total = 55.00 then
    insert into test_results values ('5_historique_paiements', 'OK', 'count=' || v_count || ' total=' || v_total);
  else
    insert into test_results values ('5_historique_paiements', 'BUG', 'count=' || v_count || ' total=' || v_total);
  end if;
end $$;

-- 6. Contrainte : montant négatif refusé
do $$
begin
  insert into subscription_payments (business_id, amount_usd, duration_months, recorded_by)
  values ('11111111-1111-1111-1111-111111111111', -5.00, 1, '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad');
  insert into test_results values ('6_montant_negatif_refuse', 'BUG_AURAIT_DU_ECHOUER', '');
exception when others then
  insert into test_results values ('6_montant_negatif_refuse', 'OK_REJETE_COMME_ATTENDU', sqlerrm);
end $$;

-- 7. Seul platform_admin peut lire l'historique des paiements (RLS)
do $$
declare
  v_visible boolean;
begin
  update profiles set role = 'owner' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad', true);
  select exists(select 1 from subscription_payments where business_id = '11111111-1111-1111-1111-111111111111') into v_visible;
  reset role;
  update profiles set role = 'platform_admin' where id = '0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad';

  if v_visible then
    insert into test_results values ('7_owner_ne_voit_pas_paiements', 'BUG_TROU_DE_SECURITE', 'un simple owner voit les paiements plateforme');
  else
    insert into test_results values ('7_owner_ne_voit_pas_paiements', 'OK', 'invisible pour un owner, comme attendu');
  end if;
end $$;

select * from test_results order by step;

rollback;

-- ============================================================
-- Limitation de débit (anti-spam)
-- ============================================================

begin;

create temp table test_results (step text, outcome text, detail text) on commit drop;
grant insert, select on test_results to anon, authenticated;

-- 8. Autorise jusqu'à la limite (3), puis refuse
do $$
declare
  v_key text := 'test_rl_' || gen_random_uuid();
  v_ok boolean;
  v_results text := '';
  i int;
begin
  for i in 1..4 loop
    select check_rate_limit(v_key, 3, 60) into v_ok;
    v_results := v_results || v_ok::text || ',';
  end loop;
  if v_results = 'true,true,true,false,' then
    insert into test_results values ('8_rate_limit', 'OK', v_results);
  else
    insert into test_results values ('8_rate_limit', 'BUG', v_results);
  end if;
end $$;

select * from test_results order by step;

rollback;
