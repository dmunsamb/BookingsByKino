-- Bug de production trouvé le 2026-09-19 : un gérant ("Shanayah") ne
-- voyait aucun membre d'équipe dans Équipe ni dans Horaires et capacité,
-- alors que des lignes existaient bien en base. Cause : is_staff_of a été
-- repassée en SECURITY INVOKER par 0003_security_advisor_fixes.sql (par
-- souci de moindre privilège), mais 0015_staff_profiles_visibility.sql a
-- ensuite ajouté une policy SELECT sur profiles ("staff_reads_business_profiles")
-- qui appelle elle-même is_staff_of(business_id).
--
-- Résultat : is_staff_of (invoker) lit "profiles" en interne, ce qui
-- réévalue les policies RLS de profiles, dont staff_reads_business_profiles
-- qui rappelle is_staff_of → récursion infinie, jusqu'à "stack depth limit
-- exceeded" (reproduit en base). Selon le plan choisi par Postgres pour
-- une ligne/un rôle donné, ça passe ou ça explose — d'où un bug qui ne
-- touchait pas tous les comptes.
--
-- is_owner_of avait déjà été repassée en SECURITY DEFINER par 0021 pour
-- une raison similaire (lecture de business_owners, elle aussi protégée
-- par RLS) ; is_staff_of n'avait pas été alignée. Même correctif ici :
-- SECURITY DEFINER fait lire "profiles" hors RLS depuis l'intérieur de la
-- fonction, ce qui casse la récursion. Corps inchangé sinon.

create or replace function public.is_staff_of(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'platform_admin'
        or (p.business_id = p_business_id and p.role in ('owner', 'staff'))
      )
  );
$$;
