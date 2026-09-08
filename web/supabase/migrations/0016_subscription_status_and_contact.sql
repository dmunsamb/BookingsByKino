-- Coordonnées de contact collectées à l'inscription (email et/ou WhatsApp,
-- au moins un des deux) — indépendantes de l'identifiant Supabase Auth
-- utilisé pour la connexion, pour que platform_admin puisse toujours
-- contacter le gérant sans avoir à consulter auth.users.
alter table public.businesses
  add column owner_email text,
  add column owner_whatsapp text;

-- Le catalogue public reste ouvert plus longtemps que le dashboard du
-- gérant (voir web/src/lib/subscription.ts pour le délai de grâce de 7
-- jours côté dashboard) : jusqu'à un mois complet après l'échéance, pour
-- ne pas couper brutalement le flux de nouveaux clients pendant que
-- KinoBooking relance le gérant pour régulariser.
drop policy if exists "public_read_businesses" on public.businesses;
create policy "public_read_businesses"
  on public.businesses for select
  using (
    (
      signup_status = 'approved'
      and (
        subscription_paid_until is null
        or now() <= subscription_paid_until + interval '1 month'
      )
    )
    or public.is_owner_of(id)
  );
