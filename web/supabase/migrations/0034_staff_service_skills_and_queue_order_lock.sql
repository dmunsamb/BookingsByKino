-- Deux ajustements demandés après usage réel du module file d'attente :
--
-- 1) Compétences par membre d'équipe (staff_member_services) : certains
--    services ne peuvent être rendus que par certains membres. Aucune
--    ligne pour un membre = qualifié pour TOUS les services (compatible
--    avec les données existantes, où cette notion n'existait pas) ; dès
--    qu'au moins une ligne existe, ce membre n'est plus considéré
--    qualifié que pour les services listés.
--
-- 2) La contrainte réelle ("seulement le numéro 1 peut être pris en
--    charge") est appliquée côté application (dashboard/queue-actions.ts),
--    pas en base : elle dépend de l'ordre calculé dynamiquement
--    (coalesce(queue_bumped_at, created_at)), qu'une contrainte SQL ne
--    peut pas exprimer simplement. Cette migration ne porte que le
--    nouveau tableau de compétences.

create table public.staff_member_services (
  staff_member_id uuid not null references public.staff_members (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_member_id, service_id)
);

alter table public.staff_member_services enable row level security;

create policy "staff_read_staff_member_services"
  on public.staff_member_services for select
  to authenticated
  using (
    exists (
      select 1 from public.staff_members sm
      where sm.id = staff_member_services.staff_member_id
        and public.is_staff_of(sm.business_id)
    )
  );

-- L'INSERT vérifie aussi que le service appartient bien au MÊME
-- établissement que le membre d'équipe (le simple FK ne l'empêche pas) :
-- sinon un gérant pourrait, par erreur d'ID, rattacher le service d'un
-- autre salon.
create policy "owner_write_staff_member_services"
  on public.staff_member_services for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.staff_members sm
      join public.services s on s.business_id = sm.business_id
      where sm.id = staff_member_services.staff_member_id
        and s.id = staff_member_services.service_id
        and public.is_owner_of(sm.business_id)
    )
  );

create policy "owner_delete_staff_member_services"
  on public.staff_member_services for delete
  to authenticated
  using (
    exists (
      select 1 from public.staff_members sm
      where sm.id = staff_member_services.staff_member_id
        and public.is_owner_of(sm.business_id)
    )
  );
