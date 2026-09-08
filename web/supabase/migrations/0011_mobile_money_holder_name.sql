-- Pour éviter les litiges lors d'un transfert mobile money, le client doit
-- pouvoir vérifier à qui appartient chaque numéro avant d'envoyer l'acompte.
-- Un nom de titulaire par opérateur, optionnel (le numéro reste utilisable
-- sans, mais il est recommandé de le renseigner).

alter table public.businesses
  add column mpesa_holder_name text,
  add column orange_money_holder_name text,
  add column airtel_money_holder_name text;
