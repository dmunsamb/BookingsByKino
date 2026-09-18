-- Deux fonctionnalités demandées ensemble avant le déploiement de la
-- refonte design :
--
-- 1) Plusieurs salons par gérant : jusqu'ici profiles.business_id ne
--    permettait qu'un seul établissement par compte. On ajoute une table
--    de rattachement plusieurs-à-plusieurs (business_owners) ; le compte
--    peut "basculer" quel établissement est actif en changeant
--    profiles.business_id (voir dashboard/etablissements/actions.ts) —
--    tout le reste du code applicatif continue de fonctionner tel quel,
--    puisqu'il lit déjà profile.business_id comme "l'établissement
--    courant" partout.
--
-- 2) Équipe : une liste nommée de membres du personnel par établissement
--    (pas forcément liés à un compte de connexion — beaucoup de petits
--    salons partagent un seul téléphone), assignable à une réservation
--    pour affichage/organisation uniquement. Volontairement SANS impact
--    sur enforce_agenda_capacity() : la capacité reste calculée par
--    créneau, pas par coiffeuse, pour ne pas toucher à la logique de
--    réservation déjà testée et auditée.

-- ============================================================
-- 1) business_owners
-- ============================================================

create table public.business_owners (
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, profile_id)
);

-- Chaque gérant existant devient propriétaire enregistré de son unique
-- établissement actuel — sans ce backfill, la bascule et la liste de
-- "mes établissements" seraient vides pour tous les comptes déjà créés.
insert into public.business_owners (business_id, profile_id)
select business_id, id
from public.profiles
where role = 'owner' and business_id is not null
on conflict do nothing;

alter table public.business_owners enable row level security;

create policy "owner_reads_own_memberships"
  on public.business_owners for select
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'platform_admin'
    )
  );

-- Aucune policy insert/update/delete : ce rattachement se crée
-- uniquement via le client admin (service-role), dans
-- dashboard/etablissements/actions.ts (nouvel établissement ajouté par
-- un gérant déjà connecté) — même principe que la création d'un
-- établissement à l'inscription (inscription/actions.ts).

-- is_owner_of ne reconnaissait jusqu'ici que l'établissement "actif"
-- (profiles.business_id) : on l'étend pour reconnaître aussi tout
-- établissement listé dans business_owners, sinon un gérant ne pourrait
-- pas lire (donc pas choisir dans le sélecteur) ses établissements non
-- actifs pour le moment. Changement additif (create or replace) : le
-- comportement existant reste inchangé, ceci ajoute seulement un cas.
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
        or exists (
          select 1 from public.business_owners bo
          where bo.business_id = p_business_id and bo.profile_id = p.id
        )
      )
  );
$$;

-- ============================================================
-- 2) staff_members
-- ============================================================

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index staff_members_business_idx on public.staff_members (business_id);

alter table public.staff_members enable row level security;

create policy "staff_read_staff_members"
  on public.staff_members for select
  to authenticated
  using (public.is_staff_of(business_id));

create policy "owner_write_staff_members"
  on public.staff_members for insert
  to authenticated
  with check (public.is_owner_of(business_id));

create policy "owner_update_staff_members"
  on public.staff_members for update
  using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));

create policy "owner_delete_staff_members"
  on public.staff_members for delete
  using (public.is_owner_of(business_id));

-- Assignation optionnelle d'un membre du personnel à une réservation
-- (affichage/organisation uniquement — voir note en tête de fichier).
alter table public.agenda_entries
  add column staff_id uuid references public.staff_members (id) on delete set null;

-- La policy staff_update_own_agenda (is_staff_of(business_id)) couvre
-- déjà l'écriture de cette nouvelle colonne, pas de policy dédiée nécessaire.

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
  ae.created_at,
  ae.reference_number,
  ae.staff_id,
  sm.name as staff_name
from public.agenda_entries ae
join public.profiles p on p.id = auth.uid()
left join public.staff_members sm on sm.id = ae.staff_id
where public.is_staff_of(ae.business_id);
