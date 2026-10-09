-- Point de repère complémentaire à l'adresse ("en face de la pharmacie
-- Mwinda", "à côté du marché central"...), demandé à l'inscription
-- (web/src/app/inscription/page.tsx) : les adresses seules sont souvent
-- insuffisantes pour se repérer à Kinshasa/Lubumbashi.
alter table businesses add column if not exists address_reference text;
