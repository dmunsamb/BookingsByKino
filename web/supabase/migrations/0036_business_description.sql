-- Description libre du salon ("qui êtes-vous, que proposez-vous") pour la
-- fiche établissement publique — demandée à l'inscription, éditable aussi
-- ensuite depuis "Mon établissement". Limite à 500 caractères : repère
-- usuel pour ce genre de champ (Google Business Profile plafonne sa
-- description à 750, Facebook "Bio" à 255) — 500 laisse la place pour
-- 2-3 phrases utiles sans encourager un pavé illisible sur mobile.
alter table public.businesses
  add column description text
  check (char_length(description) <= 500);
