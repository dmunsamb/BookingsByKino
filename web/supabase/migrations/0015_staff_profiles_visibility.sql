-- Permet à un membre du personnel/gérant de voir les profils de son
-- propre établissement (utile pour une future liste d'équipe), et à
-- platform_admin de voir tous les profils (nécessaire pour l'écran
-- d'approbation des inscriptions : afficher le nom du gérant qui a
-- soumis la demande). Policy additive : la lecture de son propre
-- profil (user_reads_own_profile) reste inchangée.

create policy "staff_reads_business_profiles"
  on public.profiles for select
  to authenticated
  using (public.is_staff_of(business_id));
