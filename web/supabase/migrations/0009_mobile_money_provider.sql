-- Le gérant peut recevoir l'acompte via plusieurs opérateurs mobile money
-- en RDC (M-Pesa, Orange Money, Airtel Money), pas seulement M-Pesa. On
-- généralise la colonne mpesa_number en mobile_money_number, accompagnée
-- d'un choix d'opérateur (un seul numéro actif à la fois pour la MVP,
-- pas plusieurs numéros simultanés).

create type public.mobile_money_provider as enum (
  'mpesa',
  'orange_money',
  'airtel_money'
);

alter table public.businesses
  rename column mpesa_number to mobile_money_number;

alter table public.businesses
  add column mobile_money_provider public.mobile_money_provider;
