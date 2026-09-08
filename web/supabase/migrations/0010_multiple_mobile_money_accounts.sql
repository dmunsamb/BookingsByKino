-- Le gérant peut en fait avoir plusieurs comptes mobile money actifs en
-- même temps (ex. M-Pesa ET Orange Money), chacun avec son propre numéro,
-- plutôt qu'un seul opérateur choisi. Revient sur la conception à choix
-- unique de 0009 : trois colonnes nullable dédiées, une par opérateur
-- (marché RDC fixe à ces trois-là, pas besoin d'une table à part pour une
-- liste ouverte). Un opérateur est "actif" simplement si son numéro est
-- renseigné — pas de booléen "activé" séparé à garder synchronisé.

alter table public.businesses
  drop column mobile_money_provider;

alter table public.businesses
  rename column mobile_money_number to mpesa_number;

alter table public.businesses
  add column orange_money_number text,
  add column airtel_money_number text;

drop type public.mobile_money_provider;
