-- KinoBooking - schéma initial
-- Reflète le modèle de données documenté dans
-- docs/functioneel-ontwerp-kinobooking.md (sections 6.1 à 6.5).

create extension if not exists pgcrypto;

-- 6.1 Bedrijf (Business)
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  main_category text not null check (main_category in ('beauty', 'horeca')),
  sub_category text,
  city text,
  address text,
  image_url text,
  mpesa_number text,
  response_timeout_hours smallint not null default 2 check (response_timeout_hours between 1 and 6),
  created_at timestamptz not null default now()
);

-- 6.2 Dienst (Service)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  category text,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_usd numeric(10, 2) not null check (price_usd >= 0),
  deposit_usd numeric(10, 2) not null check (deposit_usd >= 0),
  created_at timestamptz not null default now()
);

-- 6.4 Beschikbaarheidsinstelling (AvailabilityRule) - vooruitblikkend
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = zondag
  start_time time not null,
  end_time time not null check (end_time > start_time),
  slot_duration_minutes integer not null default 30 check (slot_duration_minutes > 0),
  capacity integer not null default 1 check (capacity > 0),
  created_at timestamptz not null default now()
);

-- 6.5 Agenda-item (AgendaEntry) - vooruitblikkend, uitbreiding van Aanvraag/Boeking (6.3)
create type public.agenda_entry_source as enum ('klant_app', 'manueel', 'walk_in', 'blokkering');
create type public.agenda_entry_status as enum (
  'pending_approval',
  'approved_waiting_payment',
  'confirmed',
  'geannuleerd'
);

create table public.agenda_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id),
  source public.agenda_entry_source not null,
  status public.agenda_entry_status,
  client_name text,
  client_phone text,
  is_vip boolean not null default false,
  start_time timestamptz not null,
  end_time timestamptz,
  deposit_cdf numeric(12, 2),
  payment_ref text,
  created_at timestamptz not null default now(),
  constraint agenda_entries_status_required_unless_blocking check (
    (source = 'blokkering' and status is null)
    or (source <> 'blokkering' and status is not null)
  )
);

create index agenda_entries_business_start_idx on public.agenda_entries (business_id, start_time);

-- Profielen: koppelt een Supabase Auth-gebruiker aan een rol en (optioneel) een zaak
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  full_name text,
  role text not null check (role in ('owner', 'staff', 'platform_admin')),
  created_at timestamptz not null default now()
);

-- Rate limiting (voir docs, section 13.6.1) : compteur simple basé sur une clé
-- (ex. "ip:route"), sans avoir besoin d'un service externe type Redis pour la MVP.
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  hit_key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_key_time_idx on public.rate_limit_hits (hit_key, created_at);

create or replace function public.check_rate_limit(
  p_key text,
  p_max_hits integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_hits
  where hit_key = p_key
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.rate_limit_hits
  where hit_key = p_key
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into public.rate_limit_hits (hit_key) values (p_key);
  return true;
end;
$$;

-- Exécutable par tout le monde (y compris les visiteurs anonymes) : c'est
-- précisément ce qui doit être vérifié avant une écriture publique.
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;
