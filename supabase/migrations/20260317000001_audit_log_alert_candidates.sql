-- Audit log alert candidate helper

create or replace function public.get_audit_alert_candidates(
  window_minutes int default 10
)
returns table (
  category text,
  subject text,
  observed_count int,
  threshold int,
  window_minutes_used int,
  latest_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with cfg as (
    select greatest(window_minutes, 1) as wm
  ),
  kid_pin_fail as (
    select
      'kid_pin_fail_burst'::text as category,
      coalesce(child_id::text, '(null)') as subject,
      count(*)::int as observed_count,
      5::int as threshold,
      (select wm from cfg) as window_minutes_used,
      max(created_at) as latest_at
    from public.kid_auth_audit_logs
    where event_type in ('pin_failed', 'pin_locked')
      and created_at >= now() - make_interval(mins => (select wm from cfg))
    group by child_id
    having count(*) >= 5
  ),
  kid_not_found_ip as (
    select
      'kid_child_not_found_ip_burst'::text as category,
      coalesce(metadata->>'ip', '(unknown-ip)') as subject,
      count(*)::int as observed_count,
      10::int as threshold,
      (select wm from cfg) as window_minutes_used,
      max(created_at) as latest_at
    from public.kid_auth_audit_logs
    where event_type = 'child_not_found'
      and created_at >= now() - make_interval(mins => (select wm from cfg))
    group by metadata->>'ip'
    having count(*) >= 10
  ),
  invite_accept_fail as (
    select
      'invite_accept_fail_burst'::text as category,
      'global'::text as subject,
      count(*)::int as observed_count,
      10::int as threshold,
      (select wm from cfg) as window_minutes_used,
      max(created_at) as latest_at
    from public.family_invite_audit_logs
    where action = 'accept_invite_failed'
      and created_at >= now() - make_interval(mins => (select wm from cfg))
    having count(*) >= 10
  )
  select * from kid_pin_fail
  union all
  select * from kid_not_found_ip
  union all
  select * from invite_accept_fail
  order by latest_at desc nulls last;
$$;

revoke all on function public.get_audit_alert_candidates(int) from public;
grant execute on function public.get_audit_alert_candidates(int) to service_role;
