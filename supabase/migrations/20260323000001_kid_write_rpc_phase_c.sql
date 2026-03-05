-- Phase C: move kid record write/badge evaluation paths behind RPCs

create or replace function public.create_kid_reading_record(
  target_child_id uuid,
  target_title text,
  target_author text default null,
  target_isbn13 text default null,
  target_cover_url text default null,
  target_status text default 'finished',
  target_stamp text default null,
  target_feeling_tags text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_creator_id uuid;
  v_book_id uuid;
  v_record_id uuid;
begin
  select c.family_id, f.created_by
    into v_family_id, v_creator_id
  from public.children c
  join public.families f on f.id = c.family_id
  where c.id = target_child_id
  limit 1;

  if v_family_id is null or v_creator_id is null then
    return null;
  end if;

  if nullif(target_isbn13, '') is not null then
    select b.id
      into v_book_id
    from public.books b
    where b.isbn13 = target_isbn13
    limit 1;
  end if;

  if v_book_id is null then
    insert into public.books (title, author, isbn13, cover_url)
    values (
      target_title,
      nullif(target_author, ''),
      nullif(target_isbn13, ''),
      nullif(target_cover_url, '')
    )
    returning id into v_book_id;
  end if;

  insert into public.reading_records (family_id, child_id, book_id, status, created_by)
  values (v_family_id, target_child_id, v_book_id, target_status, v_creator_id)
  returning id into v_record_id;

  if nullif(target_stamp, '') is not null then
    insert into public.record_reactions_child (record_id, child_id, stamp)
    values (v_record_id, target_child_id, target_stamp);
  end if;

  if coalesce(array_length(target_feeling_tags, 1), 0) > 0 then
    insert into public.record_feeling_tags (record_id, child_id, tag)
    select v_record_id, target_child_id, t.tag
    from unnest(target_feeling_tags) as t(tag)
    where nullif(t.tag, '') is not null;
  end if;

  return v_record_id;
end;
$$;

create or replace function public.evaluate_kid_badges(
  target_child_id uuid,
  target_source_record_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_records int;
  v_streak int;
  v_feelings int;
begin
  select count(*)::int
    into v_total_records
  from public.reading_records
  where child_id = target_child_id;

  with per_day as (
    select distinct date_trunc('day', created_at)::date as d
    from public.reading_records
    where child_id = target_child_id
  ), streak_input as (
    select
      d,
      d - (row_number() over (order by d))::int as grp
    from per_day
  )
  select coalesce(max(streak_len), 0)
    into v_streak
  from (
    select count(*)::int as streak_len
    from streak_input
    group by grp
  ) s;

  select count(distinct tag)::int
    into v_feelings
  from public.record_feeling_tags
  where child_id = target_child_id;

  insert into public.child_badges (child_id, badge_id, source_record_id)
  select target_child_id, badge_id, target_source_record_id
  from (
    values
      ('first_book', v_total_records >= 1),
      ('ten_books', v_total_records >= 10),
      ('seven_day_streak', v_streak >= 7),
      ('many_feelings', v_feelings >= 10)
  ) as award(badge_id, should_award)
  where should_award
  on conflict (child_id, badge_id) do nothing;
end;
$$;

create or replace function public.get_kid_badges(target_child_id uuid)
returns table (
  badge_id text,
  awarded_at timestamptz,
  id text,
  name text,
  description text,
  icon text,
  sort_order int
)
language sql
security definer
set search_path = public
as $$
  select
    cb.badge_id,
    cb.awarded_at,
    b.id,
    b.name,
    b.description,
    b.icon,
    b.sort_order
  from public.child_badges cb
  join public.badges b on b.id = cb.badge_id
  where cb.child_id = target_child_id
  order by cb.awarded_at desc;
$$;

revoke all on function public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[]) from public;
revoke all on function public.evaluate_kid_badges(uuid, uuid) from public;
revoke all on function public.get_kid_badges(uuid) from public;

grant execute on function public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[]) to service_role;
grant execute on function public.evaluate_kid_badges(uuid, uuid) to service_role;
grant execute on function public.get_kid_badges(uuid) to service_role;
