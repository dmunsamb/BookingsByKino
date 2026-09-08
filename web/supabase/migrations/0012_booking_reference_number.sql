-- Chaque réservation (quelle que soit sa source) reçoit un numéro de
-- référence court et lisible, utile pour le suivi/les litiges : le
-- client peut faire une capture d'écran, le gérant et KinoBooking
-- partagent le même identifiant. Sert aussi de base pour un futur
-- affichage anonymisé du client (US future : "Client #001042" au lieu
-- du nom).
--
-- Séquence dédiée (plutôt qu'une colonne "generated as identity")
-- pour pouvoir exposer nextval() via une fonction RPC : le client
-- anonyme doit pouvoir réserver un numéro avant l'insertion sans avoir
-- de droit de lecture sur agenda_entries (aucune policy SELECT pour
-- anon, par conception — voir 0002).

create sequence public.agenda_reference_seq start 1000;

alter table public.agenda_entries
  add column reference_number bigint not null default nextval('public.agenda_reference_seq');

create or replace function public.next_booking_reference()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.agenda_reference_seq');
$$;

grant execute on function public.next_booking_reference() to anon, authenticated;
