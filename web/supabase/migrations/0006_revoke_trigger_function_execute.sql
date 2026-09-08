-- La fonction de trigger enforce_agenda_capacity() (0004/0005) n'est censée
-- être invoquée que par le trigger lui-même, jamais directement par un
-- client. Comme toute fonction Postgres, elle reçoit par défaut le droit
-- EXECUTE pour PUBLIC à la création ; l'advisor de sécurité Supabase la
-- signale donc comme appelable via /rest/v1/rpc/enforce_agenda_capacity
-- par anon/authenticated (WARN). L'appel échouerait de toute façon (une
-- fonction de trigger ne peut être appelée que comme trigger), mais on
-- retire l'accès explicitement par principe de moindre privilège, comme
-- pour is_staff_of/is_owner_of en 0003.
--
-- Note : Supabase applique par défaut ALTER DEFAULT PRIVILEGES ... GRANT
-- EXECUTE ... TO anon, authenticated à la création de toute fonction du
-- schéma public ; un simple "revoke ... from public" ne suffit donc pas,
-- il faut aussi révoquer explicitement anon et authenticated.

revoke execute on function public.enforce_agenda_capacity()
  from public, anon, authenticated;
