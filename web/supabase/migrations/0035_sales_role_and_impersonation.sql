-- Nouveau rôle "sales" (commercial KINO CONGO, sans salon à eux) + table
-- d'assignation salon <-> commercial, pour le panneau "voir en tant que"
-- décrit avec l'utilisateur : un commercial voit tous les établissements
-- dans /admin (lecture seule), mais ne peut agir sur un établissement
-- (calendrier, réservations, etc., "comme si il était le gérant") qu'une
-- fois assigné à ce salon ET après avoir choisi explicitement d'entrer en
-- mode "voir en tant que" (gérant ou personnel) — voir lib/impersonation.ts
-- et lib/auth/dal.ts. L'assignation est décidée uniquement par le super
-- admin depuis /admin, jamais à l'inscription ni par le commercial
-- lui-même (décision produit explicite, pas de zone géographique pour
-- l'instant : un seul commercial à ce stade).

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'staff', 'platform_admin', 'sales'));

create table public.business_sales_reps (
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (business_id, profile_id)
);

alter table public.business_sales_reps enable row level security;

-- Assignation/désassignation réservée au super admin (le seul platform_admin,
-- voir décision produit) ; lecture ouverte au commercial concerné pour que
-- l'app sache quels salons il a le droit d'administrer.
create policy "platform_admin_all_business_sales_reps"
  on public.business_sales_reps for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "sales_reads_own_assignments"
  on public.business_sales_reps for select
  to authenticated
  using (profile_id = auth.uid());

-- is_owner_of / is_staff_of : un commercial assigné obtient exactement les
-- mêmes droits qu'un platform_admin, mais limités au(x) salon(s) qui lui
-- sont assignés (jamais tous). Le choix "gérant" ou "personnel" fait en
-- entrant en mode "voir en tant que" ne restreint que ce que l'interface
-- propose (canManageBusiness / isStaffMember, lib/auth/dal.ts) — comme pour
-- platform_admin, la base ne fait pas elle-même la distinction owner/staff
-- pour ce rôle : compromis assumé, "sales" reste un compte interne de
-- confiance (jamais un rôle public), jamais atteignable sans être passé par
-- le mode "voir en tant que" (qui exige déjà une ligne dans
-- business_sales_reps, voir lib/auth/dal.ts).
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
        or (
          p.role = 'sales'
          and exists (
            select 1 from public.business_sales_reps bsr
            where bsr.business_id = p_business_id and bsr.profile_id = p.id
          )
        )
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
        or exists (
          select 1 from public.business_owners bo
          where bo.business_id = p_business_id and bo.profile_id = p.id
        )
        or (
          p.role = 'sales'
          and exists (
            select 1 from public.business_sales_reps bsr
            where bsr.business_id = p_business_id and bsr.profile_id = p.id
          )
        )
      )
  );
$$;
