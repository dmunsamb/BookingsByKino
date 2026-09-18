-- Ajoute la commune (subdivision de Kinshasa) comme champ distinct de la
-- ville, entre adresse et ville dans le formulaire d'inscription. Valeur
-- libre en base (pas de contrainte enum) : la liste fermée des 24
-- communes est appliquée côté application (web/src/lib/communes.ts),
-- pas en base, pour ne rien casser si la liste évolue.
alter table businesses add column if not exists commune text;
