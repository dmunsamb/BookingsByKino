-- Vérification manuelle du RLS, à exécuter directement dans le SQL Editor
-- de Supabase (aucune installation locale nécessaire).
-- Voir docs/functioneel-ontwerp-kinobooking.md, section 13.6 / 13.6.1.
--
-- IMPORTANT : chaque bloc est INDÉPENDANT. Colle et exécute un bloc à la
-- fois (Run), note son résultat, puis passe au suivant. Supabase n'affiche
-- que le résultat de la dernière requête d'un bloc — les combiner masquerait
-- les résultats intermédiaires.

-- ============================================================
-- BLOC 0 : création des données de test (rôle par défaut de l'éditeur,
-- équivalent service role — contourne le RLS, comme prévu pour l'admin)
-- ============================================================

insert into public.businesses (id, name, main_category, city, address, mobile_money_number)
values (
  '00000000-0000-0000-0000-000000000001',
  '[TEST] Vérification RLS',
  'beauty',
  'Gombe, Kinshasa',
  'Adresse de test',
  '+243 00 000 0000'
)
on conflict (id) do nothing
returning id, name;

-- ============================================================
-- BLOC 0bis : une réservation existante déjà en base (créée en admin),
-- pour tester ensuite si un visiteur anonyme peut la lire (il ne doit pas).
-- ============================================================

insert into public.agenda_entries (business_id, source, status, client_name, client_phone, start_time)
values (
  '00000000-0000-0000-0000-000000000001',
  'klant_app',
  'pending_approval',
  'Client Secret',
  '+243 81 123 4567',
  now()
)
returning id, client_name, status;

-- ============================================================
-- TEST A : un visiteur anonyme doit pouvoir lire le catalogue public.
-- Résultat attendu : 1 ligne, resultat = 1.
-- ============================================================

set role anon;
select 'Test A - catalogue public (attendu: 1)' as test, count(*) as resultat
from public.businesses
where id = '00000000-0000-0000-0000-000000000001';
reset role;

-- ============================================================
-- TEST B : un visiteur anonyme ne doit JAMAIS pouvoir lire l'agenda.
-- Résultat attendu : 1 ligne, resultat = 0.
-- ============================================================

set role anon;
select 'Test B - agenda prive (attendu: 0)' as test, count(*) as resultat
from public.agenda_entries
where business_id = '00000000-0000-0000-0000-000000000001';
reset role;

-- ============================================================
-- TEST C : un visiteur anonyme DOIT pouvoir soumettre une demande de
-- réservation (reste PENDING_APPROVAL, phase 1 - voir BR-11).
--
-- Pas de "returning" ici : anon n'a (volontairement) aucun droit de LECTURE
-- sur agenda_entries, donc même relire la ligne qu'on vient d'insérer
-- échouerait avec une (fausse) erreur RLS. On vérifie le succès séparément
-- ci-dessous (Test C - vérification), avec le rôle par défaut qui peut lire.
-- Résultat attendu : "Success. No rows returned" (pas d'erreur).
-- ============================================================

set role anon;
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

-- Test C - vérification (rôle par défaut, qui peut lire) :
-- Résultat attendu : 1 ligne, client_name = 'Client Public OK'.
select id, client_name, status
from public.agenda_entries
where business_id = '00000000-0000-0000-0000-000000000001'
  and client_name = 'Client Public OK';

-- ============================================================
-- TEST D (fraude) : un visiteur anonyme NE DOIT PAS pouvoir s'auto-confirmer
-- une réservation directement. Résultat attendu : une ERREUR
-- "new row violates row-level security policy". Si ça réussit, c'est un
-- problème de sécurité à corriger immédiatement.
-- ============================================================

set role anon;
insert into public.agenda_entries (business_id, source, status, client_name, client_phone, start_time)
values (
  '00000000-0000-0000-0000-000000000001',
  'klant_app',
  'confirmed', -- tentative frauduleuse
  'Tentative frauduleuse',
  '+243 80 000 0000',
  now()
);
reset role;

-- ============================================================
-- NETTOYAGE : à exécuter en dernier, une fois tous les tests confirmés.
-- ============================================================

reset role;
delete from public.businesses where id = '00000000-0000-0000-0000-000000000001'
returning id, name;
-- Supprime en cascade les services/availability_rules/agenda_entries liés.
