-- Vérification manuelle du RLS, à exécuter directement dans le SQL Editor
-- de Supabase (aucune installation locale nécessaire).
-- Voir docs/functioneel-ontwerp-kinobooking.md, section 13.6 / 13.6.1.
--
-- IMPORTANT : exécute les 3 blocs SÉPARÉMENT (Run bloc par bloc), pas tout
-- d'un coup — le bloc 2 doit échouer, ce qui est le comportement attendu.

-- ============================================================
-- BLOC 1 : création des données de test (en tant que rôle par défaut,
-- équivalent service role — contourne le RLS, comme prévu pour l'admin)
-- ============================================================

insert into public.businesses (id, name, main_category, city, address, mpesa_number)
values (
  '00000000-0000-0000-0000-000000000001',
  '[TEST] Vérification RLS',
  'beauty',
  'Gombe, Kinshasa',
  'Adresse de test',
  '+243 00 000 0000'
)
on conflict (id) do nothing;

insert into public.agenda_entries (business_id, source, status, client_name, client_phone, start_time)
values (
  '00000000-0000-0000-0000-000000000001',
  'klant_app',
  'pending_approval',
  'Client Secret',
  '+243 81 123 4567',
  now()
);

-- Bascule vers le rôle "anon" pour simuler un visiteur non connecté.
set role anon;

-- Test A — doit retourner 1 (lecture publique du catalogue autorisée)
select 'Test A - catalogue public (attendu: 1)' as test, count(*) as resultat
from public.businesses
where id = '00000000-0000-0000-0000-000000000001';

-- Test B — doit retourner 0 (l'agenda ne doit JAMAIS être lisible publiquement)
select 'Test B - agenda prive (attendu: 0)' as test, count(*) as resultat
from public.agenda_entries
where business_id = '00000000-0000-0000-0000-000000000001';

-- Test C — doit réussir (un visiteur peut soumettre une demande, qui reste
-- PENDING_APPROVAL — phase 1, voir BR-11)
insert into public.agenda_entries (business_id, source, status, client_name, client_phone, start_time)
values (
  '00000000-0000-0000-0000-000000000001',
  'klant_app',
  'pending_approval',
  'Client Public OK',
  '+243 82 222 2222',
  now()
);

reset role;

-- ============================================================
-- BLOC 2 : à exécuter séparément — DOIT échouer avec une erreur du type
-- "new row violates row-level security policy". Si cette requête réussit,
-- c'est un problème de sécurité à corriger immédiatement.
-- ============================================================

set role anon;

insert into public.agenda_entries (business_id, source, status, client_name, client_phone, start_time)
values (
  '00000000-0000-0000-0000-000000000001',
  'klant_app',
  'confirmed', -- tentative de s'auto-confirmer directement : doit être refusée
  'Tentative frauduleuse',
  '+243 80 000 0000',
  now()
);

reset role;

-- ============================================================
-- BLOC 3 : à exécuter séparément, en dernier — nettoyage des données de test
-- ============================================================

reset role;
delete from public.businesses where id = '00000000-0000-0000-0000-000000000001';
-- Supprime en cascade les services/availability_rules/agenda_entries liés.
