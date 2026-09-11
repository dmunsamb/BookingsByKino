# Tests de bout en bout (avant chaque release)

Ces scripts SQL rejouent, pour chacun des trois rôles de KinoBooking
(client, gérant/personnel, administrateur), les scénarios critiques du
produit : réservation, capacité, blocages, visibilité RLS, abonnement,
paiements. Ils ont été écrits après un passage de tests manuels le
2026-09-11, qui a d'ailleurs trouvé et corrigé un vrai bug (le blocage de
créneaux n'était pas appliqué au niveau du trigger — voir migration
`0019_enforce_blocking_at_trigger_level.sql`).

## Pourquoi du SQL, pas un framework de test classique

Le projet n'a pas (encore) de suite Jest/Vitest ni de pgTAP. La logique la
plus sensible de KinoBooking (capacité, délai minimum, blocages,
abonnement, confidentialité du téléphone client) vit dans des triggers,
fonctions et policies RLS Postgres — le plus direct et le plus fidèle est
donc de la tester au même niveau, en SQL brut, plutôt que de la
réimplémenter côté JS pour la tester.

## Comment les exécuter

Directement dans le **SQL Editor du dashboard Supabase** du projet
(`ymvkmtvefvqflauhbpcx` / "booking by kino congo"), ou via `psql` :

```
psql "$DATABASE_URL" -f web/supabase/tests/01_client_scenarios.sql
psql "$DATABASE_URL" -f web/supabase/tests/02_gerant_scenarios.sql
psql "$DATABASE_URL" -f web/supabase/tests/03_admin_scenarios.sql
```

Chaque fichier se termine par un `select * from test_results` suivi d'un
`rollback` : **rien n'est jamais écrit en base**, même en cas de succès —
on peut les rejouer autant de fois qu'on veut sans polluer les données
réelles (pilote Nouschka compris).

## Comment lire le résultat

Chaque scénario ajoute une ligne à une table temporaire `test_results`
avec un `outcome` :

- `OK`, `OK_AUTORISE_COMME_ATTENDU`, `OK_REJETE_COMME_ATTENDU`,
  `OK_CORRIGE` → tout va bien, rien à faire.
- Tout le reste (`BUG`, `BUG_TROU_DE_SECURITE`,
  `BUG_AURAIT_DU_ECHOUER`/`_PASSER`, `REGRESSION`, `ECHEC_INATTENDU`) →
  **un scénario s'est comporté différemment de ce qui est attendu**, à
  investiguer avant de déployer.

## Prérequis

Les scripts pointent vers l'établissement pilote **Nouschka**
(`8fa5d756-9910-46d7-9e3b-27521ef4e9da`) et le compte
platform_admin **Dino Munsamba** (`0ad3d5d9-76da-4d4a-9f60-cb5d828cd7ad`),
avec ses horaires actuels (lun-ven 09:00-17:00 capacité 2, sam
11:00-20:00 capacité 3, fermé dimanche) et son service "coupe homme
pelouse". Si ces horaires changent, ou si Nouschka est un jour supprimée,
mettez à jour les identifiants et créneaux en tête de chaque fichier.

Les dates utilisées (12, 14 septembre 2026...) sont volontairement
écrites en dur pour rester lisibles — elles devront être avancées de
temps en temps pour rester dans le futur (le trigger refuse toute
réservation cliente le jour même ou dans le passé).

## Fichiers

| Fichier | Rôle couvert | Scénarios |
|---|---|---|
| `01_client_scenarios.sql` | Client (visiteur anonyme) | réservation avec RDV (valide/jour-même/capacité), ticket sans RDV (bypass capacité, compteur de file), garde-fous RLS (ne peut pas forcer un statut confirmé, créer une réservation manuelle/un blocage, lire l'agenda), recherche/filtre page d'accueil, établissement inactif (refusé) vs en grâce (accepté) |
| `02_gerant_scenarios.sql` | Gérant / personnel (authentifié) | réservation manuelle (aujourd'hui autorisé, capacité vérifiée), blocage de créneaux (création, reflet dans la capacité, application réelle au niveau du trigger), masquage du téléphone client (staff vs owner) |
| `03_admin_scenarios.sql` | Administrateur plateforme | visibilité d'une inscription en attente puis approuvée, calcul de la date d'abonnement (première approbation et renouvellement anticipé), historique des paiements, contrainte de montant, confidentialité de l'historique des paiements (RLS), limitation de débit |
