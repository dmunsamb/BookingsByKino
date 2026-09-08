-- Expose reference_number (0012) dans la vue tableau de bord, qui liste
-- explicitement ses colonnes plutôt que select * (voir 0002).

create or replace view public.agenda_entries_for_dashboard
with (security_invoker = true) as
select
  ae.id,
  ae.business_id,
  ae.service_id,
  ae.source,
  ae.status,
  ae.client_name,
  case
    when p.role in ('owner', 'platform_admin') then ae.client_phone
    when ae.client_phone is null then null
    else left(ae.client_phone, 3) || ' *** ' || right(ae.client_phone, 2)
  end as client_phone_display,
  ae.is_vip,
  ae.start_time,
  ae.end_time,
  ae.deposit_cdf,
  ae.payment_ref,
  ae.created_at,
  ae.reference_number
from public.agenda_entries ae
join public.profiles p on p.id = auth.uid()
where public.is_staff_of(ae.business_id);
