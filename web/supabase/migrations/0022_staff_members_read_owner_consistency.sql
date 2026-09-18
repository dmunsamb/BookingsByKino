-- La policy de lecture de staff_members ne vérifiait que is_staff_of
-- (établissement "actif" du profil), alors que la policy d'écriture
-- (owner_write/update/delete_staff_members) vérifie is_owner_of, déjà
-- étendu par la migration 0021 pour reconnaître tout établissement listé
-- dans business_owners, même non actif. Un gérant propriétaire de
-- plusieurs salons pouvait donc écrire (insert) l'équipe d'un
-- établissement qu'il possède sans l'avoir "activé" via le sélecteur,
-- mais pas la relire ensuite (incohérence RLS lecture/écriture sur la
-- même table). On aligne la lecture sur l'écriture.
drop policy if exists "staff_read_staff_members" on public.staff_members;
create policy "staff_read_staff_members"
  on public.staff_members for select
  to authenticated
  using (public.is_staff_of(business_id) or public.is_owner_of(business_id));
