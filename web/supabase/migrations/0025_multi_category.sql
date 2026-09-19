-- Un établissement peut appartenir à plusieurs catégories (ex: salon de
-- coiffure ET salon de beauté) — remplace sub_category (une seule
-- valeur) par categories (tableau). Rempli d'abord à partir de
-- sub_category pour ne perdre aucune donnée existante, avant de
-- supprimer l'ancienne colonne.
alter table businesses add column categories text[] not null default '{}';

update businesses
set categories = array[sub_category]
where sub_category is not null and sub_category <> '';

alter table businesses drop column sub_category;
