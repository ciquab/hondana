-- Phase step: move kid PIN auth core queries off direct service-role table access

create or replace function public.get_child_auth_for_login(target_child_id uuid)
returns table (
  child_exists boolean,
  pin_hash text,
  pin_failed_count int,
  pin_locked_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    true as child_exists,
    cam.pin_hash,
    coalesce(cam.pin_failed_count, 0) as pin_failed_count,
    cam.pin_locked_until
  from public.children c
  left join public.child_auth_methods cam on cam.child_id = c.id
  where c.id = target_child_id
  limit 1;

  if not found then
    return query
    select
      false as child_exists,
      null::text as pin_hash,
      0::int as pin_failed_count,
      null::timestamptz as pin_locked_until;
  end if;
end;
$$;

create or replace function public.register_kid_pin_attempt(
  target_child_id uuid,
  success boolean
)
returns table (
  pin_failed_count int,
  pin_locked_until timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_fail_count int;
  next_locked_until timestamptz;
begin
  if success then
    update public.child_auth_methods
    set pin_failed_count = 0,
        pin_locked_until = null
    where child_id = target_child_id;

    return query
    select 0::int, null::timestamptz;
    return;
  end if;

  select coalesce(pin_failed_count, 0) + 1
    into next_fail_count
  from public.child_auth_methods
  where child_id = target_child_id;

  if next_fail_count is null then
    next_fail_count := 1;
  end if;

  if next_fail_count >= 5 then
    next_locked_until := now() + interval '15 minutes';
  else
    next_locked_until := null;
  end if;

  update public.child_auth_methods
  set pin_failed_count = next_fail_count,
      pin_locked_until = next_locked_until
  where child_id = target_child_id;

  return query
  select next_fail_count, next_locked_until;
end;
$$;

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
begin
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
    coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_child_auth_for_login(uuid) from public;
revoke all on function public.register_kid_pin_attempt(uuid, boolean) from public;
revoke all on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) from public;

grant execute on function public.get_child_auth_for_login(uuid) to anon, authenticated, service_role;
grant execute on function public.register_kid_pin_attempt(uuid, boolean) to anon, authenticated, service_role;
grant execute on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) to anon, authenticated, service_role;
