-- Auto-inscription des gérants (jusqu'ici les comptes n'étaient créés que
-- manuellement par la plateforme). Toute nouvelle inscription reste en
-- attente de validation manuelle par KinoBooking avant d'être visible du
-- public — l'inscription libre ne doit jamais rendre un établissement
-- actif sans vérification humaine (même principe que BR-2 côté client :
-- rien n'est engageant/visible avant validation).
--
-- subscription_paid_until prépare le suivi de l'abonnement mensuel
-- (statut actif/en attente/inactif calculé à partir de cette date) —
-- la logique d'affichage et de relance WhatsApp arrive dans une étape
-- suivante, mais la colonne est ajoutée maintenant pour éviter une
-- migration séparée.

create type public.business_signup_status as enum (
  'pending_approval',
  'approved',
  'rejected'
);

alter table public.businesses
  add column signup_status public.business_signup_status not null default 'pending_approval',
  add column subscription_paid_until timestamptz;

-- Les établissements déjà existants (créés manuellement avant
-- l'auto-inscription) sont considérés déjà validés.
update public.businesses set signup_status = 'approved';

-- Le catalogue public ne doit montrer que les établissements validés ;
-- le propriétaire (ou platform_admin, via is_owner_of) doit pouvoir
-- lire son propre établissement même en attente, pour que son dashboard
-- affiche le bon statut.
drop policy if exists "public_read_businesses" on public.businesses;
create policy "public_read_businesses"
  on public.businesses for select
  using (signup_status = 'approved' or public.is_owner_of(id));

-- Bucket public pour les logos uploadés à l'inscription (écriture
-- uniquement via le client admin/service-role côté serveur, jamais
-- directement par le navigateur — voir web/src/app/inscription/actions.ts).
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;
