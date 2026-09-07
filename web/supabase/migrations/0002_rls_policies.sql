-- KinoBooking - Row Level Security (RLS)
-- Voir docs/functioneel-ontwerp-kinobooking.md, section 13.6 et 13.6.1.
-- Principe : la base de données décide qui voit/écrit quoi, pas seulement le front-end.

alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.agenda_entries enable row level security;
alter table public.profiles enable row level security;
alter table public.rate_limit_hits enable row level security;
-- Aucune policy sur rate_limit_hits : accès refusé à tout le monde par défaut.
-- Seule la fonction check_rate_limit() (security definer) peut y écrire/lire.

-- ============================================================
-- Lecture publique du catalogue (portail client, sans compte)
-- ============================================================

create policy "public_read_businesses"
  on public.businesses for select
  using (true);

create policy "public_read_services"
  on public.services for select
  using (true);

create policy "public_read_availability_rules"
  on public.availability_rules for select
  using (true);

-- ============================================================
-- Fonction utilitaire : l'utilisateur connecté appartient-il à cet établissement ?
-- ============================================================

create or replace function public.is_staff_of(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'platform_admin'
        or (p.business_id = p_business_id and p.role in ('owner', 'staff'))
      )
  );
$$;

create or replace function public.is_owner_of(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'platform_admin'
        or (p.business_id = p_business_id and p.role = 'owner')
      )
  );
$$;

-- ============================================================
-- Écriture du catalogue et des disponibilités : réservée au propriétaire (US-O6, US-O13)
-- ============================================================

create policy "owner_update_business"
  on public.businesses for update
  using (public.is_owner_of(id))
  with check (public.is_owner_of(id));

create policy "owner_write_services"
  on public.services for insert
  to authenticated
  with check (public.is_owner_of(business_id));

create policy "owner_update_services"
  on public.services for update
  using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));

create policy "owner_delete_services"
  on public.services for delete
  using (public.is_owner_of(business_id));

create policy "owner_write_availability_rules"
  on public.availability_rules for insert
  to authenticated
  with check (public.is_owner_of(business_id));

create policy "owner_update_availability_rules"
  on public.availability_rules for update
  using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));

create policy "owner_delete_availability_rules"
  on public.availability_rules for delete
  using (public.is_owner_of(business_id));

-- ============================================================
-- Agenda-items : la partie la plus sensible (contient nom/téléphone du client)
-- ============================================================

-- Le public (sans compte) ne peut faire que des inserts PROPRES et limités :
-- - une demande de réservation en ligne (reste PENDING_APPROVAL, phase 1 - voir BR-11)
-- - un ticket walk-in (immédiatement CONFIRMED, voir BR-7)
-- Jamais un autre statut, jamais "manueel" (manuel) ou "blokkering" (blocage).
create policy "public_insert_klant_bookings"
  on public.agenda_entries for insert
  to anon, authenticated
  with check (
    (source = 'klant_app' and status = 'pending_approval')
    or (source = 'walk_in' and status = 'confirmed')
  );

-- Le personnel/gérant peut ajouter des réservations manuelles et des blocages (US-O14, US-S4)
create policy "staff_insert_manual_entries"
  on public.agenda_entries for insert
  to authenticated
  with check (public.is_staff_of(business_id));

-- Seuls le personnel/gérant de l'établissement concerné (ou platform_admin) peuvent lire l'agenda.
-- Les clients n'ont AUCUN accès direct en lecture à cette table (confidentialité) - voir
-- la vue agenda_capacity_public plus bas pour ce que le portail client peut voir.
create policy "staff_read_own_agenda"
  on public.agenda_entries for select
  to authenticated
  using (public.is_staff_of(business_id));

-- Seuls le personnel/gérant de l'établissement concerné peuvent valider/refuser une demande,
-- confirmer manuellement un paiement, ou modifier un item.
create policy "staff_update_own_agenda"
  on public.agenda_entries for update
  to authenticated
  using (public.is_staff_of(business_id))
  with check (public.is_staff_of(business_id));

-- ============================================================
-- Profils
-- ============================================================

create policy "user_reads_own_profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Aucune policy insert/update/delete pour les utilisateurs : les profils sont créés
-- via la service role key lors de l'onboarding (US-A1), jamais par l'utilisateur lui-même.

-- ============================================================
-- Vue : numéro de téléphone masqué pour le personnel (BR-8, imposé par la base)
-- ============================================================

create or replace view public.agenda_entries_for_dashboard
with (security_invoker = true) as
select
  ae.id,
  ae.business_id,
  ae.service_id,
  ae.source,
  ae.status,
  ae.client_name,
  case
    when p.role in ('owner', 'platform_admin') then ae.client_phone
    when ae.client_phone is null then null
    else left(ae.client_phone, 3) || ' *** ' || right(ae.client_phone, 2)
  end as client_phone_display,
  ae.is_vip,
  ae.start_time,
  ae.end_time,
  ae.deposit_cdf,
  ae.payment_ref,
  ae.created_at
from public.agenda_entries ae
join public.profiles p on p.id = auth.uid()
where public.is_staff_of(ae.business_id);

-- ============================================================
-- Vue : uniquement la capacité agrégée, publique et sans risque pour la vie
-- privée (FR-9.4). Ne contient JAMAIS de nom ou de numéro - que des compteurs.
-- ============================================================

create or replace view public.agenda_capacity_public as
select
  business_id,
  start_time,
  end_time,
  count(*) as booked_count
from public.agenda_entries
where status in ('pending_approval', 'approved_waiting_payment', 'confirmed')
group by business_id, start_time, end_time;

grant select on public.agenda_capacity_public to anon, authenticated;
