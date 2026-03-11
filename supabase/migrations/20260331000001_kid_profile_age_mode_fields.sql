-- PostgreSQL cannot change an existing function's return type in-place.
-- Drop and recreate to extend get_kid_child_profile with age-mode fields.
drop function if exists public.get_kid_child_profile(uuid);

create or replace function public.get_kid_child_profile(target_child_id uuid)
returns table (
  id uuid,
  display_name text,
  birth_year int,
  age_mode_override text
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.display_name,
    c.birth_year,
    c.age_mode_override
  from public.children c
  where c.id = target_child_id
  limit 1;
$$;

revoke all on function public.get_kid_child_profile(uuid) from public;
grant execute on function public.get_kid_child_profile(uuid) to service_role;
grant execute on function public.get_kid_child_profile(uuid) to child_session;
