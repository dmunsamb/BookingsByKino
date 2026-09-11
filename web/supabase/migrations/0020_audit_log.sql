-- Journal d'audit des actions sensibles, demandé après un scénario
-- concret : un client affirme avoir réservé, le gérant affirme n'avoir
-- rien reçu — sans trace horodatée et infalsifiable, impossible de
-- trancher. Couvre les actions sensibles/irréversibles identifiées :
-- création et changement de statut d'une réservation, approbation/refus
-- d'un salon, changement de date d'abonnement, changement de rôle,
-- suppression d'un service ou d'un horaire.
--
-- Volontairement PAS un log générique de toute lecture/écriture : à ce
-- volume (un salon pilote), quelques centaines de lignes par jour tout
-- au plus, coût de stockage et d'écriture négligeables. subscription_payments
-- (0017) sert déjà d'historique dédié aux paiements — pas dupliqué ici.
--
-- Écriture exclusivement via des triggers SECURITY DEFINER : aucune
-- policy INSERT/UPDATE/DELETE n'est créée pour anon/authenticated, donc
-- personne (pas même un platform_admin) ne peut écrire ou modifier une
-- ligne depuis l'application — seule la base elle-même y écrit, au
-- moment exact de l'action qu'elle constate. Lecture réservée à
-- platform_admin, comme subscription_payments.

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_table text not null,
  entity_id uuid not null,
  business_id uuid references public.businesses(id) on delete set null,
  old_value jsonb,
  new_value jsonb
);

create index audit_log_business_id_idx on public.audit_log (business_id, occurred_at desc);
create index audit_log_entity_idx on public.audit_log (entity_table, entity_id, occurred_at desc);

alter table public.audit_log enable row level security;

create policy "platform_admin_reads_audit_log"
  on public.audit_log for select
  using (public.is_platform_admin());

-- ============================================================
-- Fonction partagée d'écriture (capture l'acteur courant une seule fois)
-- ============================================================

create or replace function public.write_audit_log(
  p_action text,
  p_entity_table text,
  p_entity_id uuid,
  p_business_id uuid,
  p_old_value jsonb,
  p_new_value jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
begin
  if v_actor_id is not null then
    select role into v_actor_role from public.profiles where id = v_actor_id;
  end if;

  insert into public.audit_log (actor_id, actor_role, action, entity_table, entity_id, business_id, old_value, new_value)
  values (v_actor_id, v_actor_role, p_action, p_entity_table, p_entity_id, p_business_id, p_old_value, p_new_value);
end;
$$;

-- ============================================================
-- Réservations : création (par n'importe quel canal) + changement de statut
-- ============================================================

create or replace function public.log_agenda_entry_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(
      'booking_created', 'agenda_entries', new.id, new.business_id,
      null,
      jsonb_build_object(
        'source', new.source, 'status', new.status, 'service_id', new.service_id,
        'start_time', new.start_time, 'reference_number', new.reference_number
      )
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.write_audit_log(
      'booking_status_changed', 'agenda_entries', new.id, new.business_id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_entries_audit on public.agenda_entries;
create trigger agenda_entries_audit
  after insert or update on public.agenda_entries
  for each row execute function public.log_agenda_entry_audit();

-- ============================================================
-- Établissements : approbation/refus, changement de date d'abonnement
-- ============================================================

create or replace function public.log_business_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.signup_status is distinct from old.signup_status then
    perform public.write_audit_log(
      'business_signup_status_changed', 'businesses', new.id, new.id,
      jsonb_build_object('signup_status', old.signup_status),
      jsonb_build_object('signup_status', new.signup_status)
    );
  end if;
  if new.subscription_paid_until is distinct from old.subscription_paid_until then
    perform public.write_audit_log(
      'subscription_paid_until_changed', 'businesses', new.id, new.id,
      jsonb_build_object('subscription_paid_until', old.subscription_paid_until),
      jsonb_build_object('subscription_paid_until', new.subscription_paid_until)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_audit on public.businesses;
create trigger businesses_audit
  after update on public.businesses
  for each row execute function public.log_business_audit();

-- ============================================================
-- Profils : changement de rôle (ex. promotion en platform_admin)
-- ============================================================

create or replace function public.log_profile_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    perform public.write_audit_log(
      'profile_role_changed', 'profiles', new.id, new.business_id,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.log_profile_audit();

-- ============================================================
-- Suppression d'un service ou d'un horaire (perte de données définitive)
-- ============================================================

create or replace function public.log_service_delete_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'service_deleted', 'services', old.id, old.business_id,
    jsonb_build_object(
      'name', old.name, 'category', old.category, 'duration_minutes', old.duration_minutes,
      'price_usd', old.price_usd, 'deposit_usd', old.deposit_usd
    ),
    null
  );
  return old;
end;
$$;

drop trigger if exists services_delete_audit on public.services;
create trigger services_delete_audit
  after delete on public.services
  for each row execute function public.log_service_delete_audit();

create or replace function public.log_availability_rule_delete_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_log(
    'availability_rule_deleted', 'availability_rules', old.id, old.business_id,
    jsonb_build_object(
      'weekday', old.weekday, 'start_time', old.start_time, 'end_time', old.end_time,
      'slot_duration_minutes', old.slot_duration_minutes, 'capacity', old.capacity
    ),
    null
  );
  return old;
end;
$$;

drop trigger if exists availability_rules_delete_audit on public.availability_rules;
create trigger availability_rules_delete_audit
  after delete on public.availability_rules
  for each row execute function public.log_availability_rule_delete_audit();

-- ============================================================
-- Moindre privilège : comme enforce_agenda_capacity (0006), ces fonctions
-- ne sont censées être invoquées que par leurs triggers respectifs, ou
-- (pour write_audit_log) par les autres fonctions de ce fichier — jamais
-- directement par un client. Sans ce revoke, write_audit_log serait
-- appelable via /rest/v1/rpc/write_audit_log par n'importe quel visiteur,
-- qui pourrait alors y insérer de fausses entrées : le journal ne serait
-- plus digne de confiance.
revoke execute on function public.write_audit_log(text, text, uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.log_agenda_entry_audit()
  from public, anon, authenticated;
revoke execute on function public.log_business_audit()
  from public, anon, authenticated;
revoke execute on function public.log_profile_audit()
  from public, anon, authenticated;
revoke execute on function public.log_service_delete_audit()
  from public, anon, authenticated;
revoke execute on function public.log_availability_rule_delete_audit()
  from public, anon, authenticated;
