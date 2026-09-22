-- Colonnes filtrées fréquemment (fiche établissement, agenda, dashboard
-- "mes établissements", assignation commerciale) mais sans index dédié :
-- services.business_id et availability_rules.business_id n'ont qu'un index
-- implicite sur leur clé primaire (id) et availability_rules n'a un index
-- que sur staff_id ; business_owners/business_sales_reps ont une clé
-- primaire composite (business_id, profile_id) qui n'aide pas une
-- recherche par profile_id seul (colonne non préfixe).
create index services_business_idx on public.services (business_id);
create index availability_rules_business_idx on public.availability_rules (business_id);
create index business_owners_profile_idx on public.business_owners (profile_id);
create index business_sales_reps_profile_idx on public.business_sales_reps (profile_id);
