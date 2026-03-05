-- Further harden kid auth audit RPC field handling.
-- - normalize/whitelist event_type
-- - sanitize reason text in DB

create or replace function public.log_kid_auth_audit_event(
  target_child_id uuid,
  target_event_type text,
  target_reason text,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_ip text;
  raw_ua text;
  safe_ip text;
  safe_ua text;
  safe_reason text;
  safe_event_type text;
begin
  raw_ip := coalesce(target_metadata ->> 'ip', '');
  raw_ua := coalesce(target_metadata ->> 'userAgent', '');

  safe_ip := left(regexp_replace(raw_ip, '[\r\n\t]', ' ', 'g'), 64);
  safe_ua := left(regexp_replace(raw_ua, '[\r\n\t]', ' ', 'g'), 300);
  safe_reason := left(regexp_replace(coalesce(target_reason, ''), '[\r\n\t]', ' ', 'g'), 200);

  if target_event_type in ('invalid_input', 'child_not_found', 'pin_not_set', 'locked', 'pin_failed', 'pin_locked', 'success') then
    safe_event_type := target_event_type;
  else
    safe_event_type := 'invalid_input';
  end if;

  insert into public.kid_auth_audit_logs (
    child_id,
    event_type,
    reason,
    metadata
  )
  values (
    target_child_id,
    safe_event_type,
    nullif(btrim(safe_reason), ''),
    jsonb_build_object(
      'ip', nullif(btrim(safe_ip), ''),
      'userAgent', nullif(btrim(safe_ua), '')
    )
  );
end;
$$;

revoke all on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) from public;
grant execute on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) to service_role;
