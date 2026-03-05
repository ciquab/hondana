-- Harden kid auth audit log RPC with server-side metadata sanitization.

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
begin
  raw_ip := coalesce(target_metadata ->> 'ip', '');
  raw_ua := coalesce(target_metadata ->> 'userAgent', '');

  safe_ip := left(regexp_replace(raw_ip, '[\r\n\t]', ' ', 'g'), 64);
  safe_ua := left(regexp_replace(raw_ua, '[\r\n\t]', ' ', 'g'), 300);

  insert into public.kid_auth_audit_logs (
    child_id,
    event_type,
    reason,
    metadata
  )
  values (
    target_child_id,
    target_event_type,
    target_reason,
    jsonb_build_object(
      'ip', nullif(btrim(safe_ip), ''),
      'userAgent', nullif(btrim(safe_ua), '')
    )
  );
end;
$$;

revoke all on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) from public;
grant execute on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) to service_role;
