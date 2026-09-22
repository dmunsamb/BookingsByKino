-- Un membre du personnel peut être promu "gérant" (is_manager) : il obtient
-- alors les mêmes droits que le gérant/propriétaire partout dans le
-- dashboard (services, horaires, paiements, photos, avis...), SAUF gérer
-- l'équipe elle-même (ajouter/supprimer un membre, donner/retirer un accès)
-- — décision produit explicite, jamais déléguée même à un "gérant" promu.
alter table public.profiles
  add column is_manager boolean not null default false;

-- Lien optionnel entre un membre de l'équipe (staff_members, utilisé pour
-- le planning/la capacité) et un compte de connexion (profiles) : un
-- membre peut exister sans compte (juste affiché dans le planning), ou en
-- avoir un une fois l'accès octroyé par le gérant (téléphone + mot de
-- passe, voir dashboard/equipe). "on delete set null" : supprimer le
-- compte (auth.users, cascade vers profiles) ne supprime jamais la ligne
-- staff_members elle-même.
alter table public.staff_members
  add column profile_id uuid references public.profiles(id) on delete set null,
  add constraint staff_members_profile_id_key unique (profile_id);

-- is_owner_of() : étendu pour reconnaître un membre "gérant" (is_manager)
-- comme équivalent au propriétaire — partout où is_owner_of est utilisé
-- aujourd'hui. Changement additif : le comportement existant (owner,
-- platform_admin, business_owners) reste inchangé.
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
        or (p.business_id = p_business_id and p.role = 'staff' and p.is_manager)
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

-- Gestion de l'équipe (ajout, suppression, octroi/retrait d'accès) :
-- jamais délégable à un membre du personnel même promu "gérant" — reprend
-- exactement l'ancienne définition de is_owner_of (avant l'ajout
-- ci-dessus), pour que ce périmètre précis reste strictement
-- owner/platform_admin/sales-assigné.
create or replace function public.is_team_manager_of(p_business_id uuid)
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

-- Ajout/suppression d'un membre de l'équipe : strictement is_team_manager_of
-- (jamais un "gérant" promu). La lecture (staff_read_staff_members) et la
-- mise à jour courante (photo, actif/inactif, compétences, octroi
-- d'accès — voir dashboard/equipe/actions.ts) restent sur is_owner_of,
-- inchangé.
drop policy if exists "owner_write_staff_members" on public.staff_members;
create policy "owner_write_staff_members"
  on public.staff_members for insert
  to authenticated
  with check (public.is_team_manager_of(business_id));

drop policy if exists "owner_delete_staff_members" on public.staff_members;
create policy "owner_delete_staff_members"
  on public.staff_members for delete
  using (public.is_team_manager_of(business_id));

-- Un "gérant" promu (is_manager) voit le téléphone client en clair, comme
-- le propriétaire — sinon canManageBusiness() (lib/auth/dal.ts) autoriserait
-- le lien WhatsApp côté interface avec un numéro masqué, inutilisable.
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
    when p.role in ('owner', 'platform_admin') or (p.role = 'staff' and p.is_manager)
      then ae.client_phone
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
  sm.name as staff_name,
  ae.client_note,
  ae.queue_bumped_at,
  ae.queue_shift_used,
  ae.review_token
from public.agenda_entries ae
join public.profiles p on p.id = auth.uid()
left join public.staff_members sm on sm.id = ae.staff_id
where public.is_staff_of(ae.business_id);
