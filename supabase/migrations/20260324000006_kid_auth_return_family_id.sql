-- Include family_id in kid auth lookup so app can mint child_session JWT claims.

create or replace function public.get_child_auth_for_login(target_child_id uuid)
returns table (
  child_exists boolean,
  family_id uuid,
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
    c.family_id,
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
      null::uuid as family_id,
      null::text as pin_hash,
      0::int as pin_failed_count,
      null::timestamptz as pin_locked_until;
  end if;
end;
$$;

revoke all on function public.get_child_auth_for_login(uuid) from public;
grant execute on function public.get_child_auth_for_login(uuid) to service_role;
