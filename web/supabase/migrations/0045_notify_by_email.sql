-- Préférence de notification par email, un seul interrupteur par compte
-- (sa signification dépend du rôle, affichée côté application) :
-- - owner/staff "gérant" (is_manager) : email à chaque nouvelle demande
--   de réservation sur leur établissement.
-- - platform_admin : email à chaque nouvelle inscription en attente de
--   validation.
-- Activé par défaut : ce sont des notifications opérationnelles (pas du
-- marketing), un gérant qui ne surveille pas son tableau de bord en
-- continu a besoin d'être prévenu sans action préalable de sa part.
alter table public.profiles add column if not exists notify_by_email boolean not null default true;
