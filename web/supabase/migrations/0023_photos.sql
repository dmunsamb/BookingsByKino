-- Photos : galerie du salon (plusieurs, défilables), photo par
-- prestation, photo par membre d'équipe. Prévu depuis l'onboarding
-- (docs/functioneel-ontwerp-kinobooking.md) et repris avec le nouveau
-- design.
--
-- Toutes les écritures (upload comme suppression de fichier) passent par
-- le client admin (service-role) côté serveur — voir
-- lib/supabase/media-admin.ts — jamais directement par le navigateur,
-- même principe que le logo à l'inscription (migration 0014). Le bucket
-- n'a donc pas besoin de policies storage.objects dédiées : seule sa
-- lecture publique compte ici.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ============================================================
-- Galerie du salon
-- ============================================================

create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index business_photos_business_idx on public.business_photos (business_id, position);

alter table public.business_photos enable row level security;

-- Lecture publique alignée sur public_read_businesses (0016) : une
-- galerie ne doit pas fuiter la photo d'un salon pas encore approuvé
-- (ou dont l'abonnement a expiré depuis plus d'un mois) avant son
-- propriétaire.
create policy "public_read_business_photos"
  on public.business_photos for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_photos.business_id
        and (
          (
            b.signup_status = 'approved'
            and (b.subscription_paid_until is null or now() <= b.subscription_paid_until + interval '1 month')
          )
          or public.is_owner_of(b.id)
        )
    )
  );

create policy "owner_write_business_photos"
  on public.business_photos for insert
  to authenticated
  with check (public.is_owner_of(business_id));

create policy "owner_delete_business_photos"
  on public.business_photos for delete
  using (public.is_owner_of(business_id));

create policy "owner_update_business_photos"
  on public.business_photos for update
  using (public.is_owner_of(business_id))
  with check (public.is_owner_of(business_id));

-- ============================================================
-- Photo de prestation et de membre d'équipe (une seule chacune)
-- ============================================================

alter table public.services add column photo_url text;
alter table public.staff_members add column photo_url text;
