-- Messages du formulaire de contact sur la sales page
-- (web/src/app/devenir-partenaire/page.tsx). Écriture exclusivement via
-- le client admin (service-role) côté serveur, comme le reste des
-- flux publics non authentifiés de ce projet (inscription, réservation) :
-- pas de policy INSERT pour anon ici. Lecture réservée à platform_admin.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "platform_admin_all_contact_messages"
  on public.contact_messages for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
