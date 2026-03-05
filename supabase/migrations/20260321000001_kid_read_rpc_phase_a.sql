-- Phase A: move kid read-model queries behind RPCs

create or replace function public.get_kid_child_profile(target_child_id uuid)
returns table (
  id uuid,
  display_name text
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.display_name
  from public.children c
  where c.id = target_child_id
  limit 1;
$$;

create or replace function public.get_kid_recent_records(
  target_child_id uuid,
  max_rows int default 50
)
returns table (
  id uuid,
  created_at timestamptz,
  title text,
  cover_url text
)
language sql
security definer
set search_path = public
as $$
  select
    rr.id,
    rr.created_at,
    b.title,
    b.cover_url
  from public.reading_records rr
  left join public.books b on b.id = rr.book_id
  where rr.child_id = target_child_id
  order by rr.created_at desc
  limit greatest(max_rows, 1);
$$;

create or replace function public.get_kid_calendar_entries(
  target_child_id uuid,
  from_ts timestamptz,
  to_ts timestamptz
)
returns table (
  created_at timestamptz,
  stamp text
)
language sql
security definer
set search_path = public
as $$
  select
    rr.created_at,
    rrc.stamp
  from public.reading_records rr
  left join public.record_reactions_child rrc
    on rrc.record_id = rr.id
   and rrc.child_id = rr.child_id
  where rr.child_id = target_child_id
    and rr.created_at >= from_ts
    and rr.created_at < to_ts
  order by rr.created_at asc;
$$;

revoke all on function public.get_kid_child_profile(uuid) from public;
revoke all on function public.get_kid_recent_records(uuid, int) from public;
revoke all on function public.get_kid_calendar_entries(uuid, timestamptz, timestamptz) from public;

grant execute on function public.get_kid_child_profile(uuid) to service_role;
grant execute on function public.get_kid_recent_records(uuid, int) to service_role;
grant execute on function public.get_kid_calendar_entries(uuid, timestamptz, timestamptz) to service_role;
