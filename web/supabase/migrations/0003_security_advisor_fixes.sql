-- Corrige les recommandations de l'advisor de sécurité Supabase (get_advisors)
-- après application du schéma initial (0001/0002). Appliqué en direct sur le
-- projet via le MCP Supabase le 2026-09-07 ; ce fichier documente le même
-- changement pour que le schéma versionné reste synchronisé avec la base.

-- 1. is_owner_of / is_staff_of n'ont besoin que de lire la ligne "profiles"
-- de l'utilisateur courant (auth.uid()), que la policy "user_reads_own_profile"
-- l'autorise déjà à lire lui-même. SECURITY DEFINER était superflu ici :
-- passage en SECURITY INVOKER (principe du moindre privilège), ce qui
-- supprime aussi l'avertissement "callable par anon/authenticated en tant
-- que SECURITY DEFINER".

create or replace function public.is_staff_of(p_business_id uuid)
returns boolean
language sql
security invoker
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

create or replace function public.is_owner_of(p_business_id uuid)
returns boolean
language sql
security invoker
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'platform_admin'
        or (p.business_id = p_business_id and p.role = 'owner')
      )
  );
$$;

-- 2. agenda_capacity_public : une VIEW "security definer" (comportement par
-- défaut d'une vue créée par un rôle privilégié) est signalée en ERROR par
-- l'advisor Supabase, car c'est un piège de sécurité fréquent en général.
-- On la remplace par une fonction SECURITY DEFINER explicite et étroitement
-- scopée (ne retourne jamais que des compteurs agrégés, aucune donnée
-- personnelle) : même niveau de risque assumé que check_rate_limit, mais
-- plus explicite et auditable qu'une vue "invisible".

drop view if exists public.agenda_capacity_public;

create or replace function public.get_agenda_capacity(p_business_id uuid)
returns table (start_time timestamptz, end_time timestamptz, booked_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    ae.start_time,
    ae.end_time,
    count(*) as booked_count
  from public.agenda_entries ae
  where ae.business_id = p_business_id
    and ae.status in ('pending_approval', 'approved_waiting_payment', 'confirmed')
  group by ae.start_time, ae.end_time;
$$;

grant execute on function public.get_agenda_capacity(uuid) to anon, authenticated;

-- 3. rate_limit_hits : RLS activé sans policy = deny-all, c'est volontaire
-- (seule check_rate_limit, security definer, peut y écrire/lire). L'advisor
-- le signale en INFO ; aucune action nécessaire, comportement voulu.
