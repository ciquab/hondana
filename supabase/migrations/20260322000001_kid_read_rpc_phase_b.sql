-- Phase B: move remaining kid read/message flows behind RPCs

create or replace function public.get_kid_messages(
  target_child_id uuid,
  max_rows int default 50
)
returns table (
  id uuid,
  record_id uuid,
  body text,
  created_at timestamptz,
  book_title text,
  unread boolean,
  reactions jsonb
)
language sql
security definer
set search_path = public
as $$
  with kid_records as (
    select rr.id, b.title
    from public.reading_records rr
    left join public.books b on b.id = rr.book_id
    where rr.child_id = target_child_id
    order by rr.created_at desc
    limit greatest(max_rows, 1)
  )
  select
    rc.id,
    rc.record_id,
    rc.body,
    rc.created_at,
    coalesce(kr.title, '本') as book_title,
    not exists (
      select 1
      from public.child_message_views cmv
      where cmv.child_id = target_child_id
        and cmv.comment_id = rc.id
    ) as unread,
    coalesce((
      select jsonb_object_agg(emoji_counts.emoji, emoji_counts.cnt)
      from (
        select rr.emoji, count(*)::int as cnt
        from public.record_reactions rr
        where rr.record_id = rc.record_id
        group by rr.emoji
      ) as emoji_counts
    ), '{}'::jsonb) as reactions
  from public.record_comments rc
  join kid_records kr on kr.id = rc.record_id
  order by rc.created_at desc
  limit greatest(max_rows, 1);
$$;

create or replace function public.get_kid_record_detail(
  target_child_id uuid,
  target_record_id uuid
)
returns table (
  id uuid,
  created_at timestamptz,
  status text,
  memo text,
  finished_on date,
  child_display_name text,
  title text,
  author text,
  isbn13 text,
  cover_url text,
  stamp text,
  feeling_tags text[]
)
language sql
security definer
set search_path = public
as $$
  select
    rr.id,
    rr.created_at,
    rr.status,
    rr.memo,
    rr.finished_on,
    c.display_name as child_display_name,
    b.title,
    b.author,
    b.isbn13,
    b.cover_url,
    rrc.stamp,
    coalesce(
      array_agg(rft.tag order by rft.tag) filter (where rft.tag is not null),
      '{}'::text[]
    ) as feeling_tags
  from public.reading_records rr
  join public.children c on c.id = rr.child_id
  left join public.books b on b.id = rr.book_id
  left join public.record_reactions_child rrc
    on rrc.record_id = rr.id
   and rrc.child_id = rr.child_id
  left join public.record_feeling_tags rft
    on rft.record_id = rr.id
   and rft.child_id = rr.child_id
  where rr.id = target_record_id
    and rr.child_id = target_child_id
  group by rr.id, c.display_name, b.title, b.author, b.isbn13, b.cover_url, rrc.stamp
  limit 1;
$$;

create or replace function public.get_kid_record_comments(
  target_child_id uuid,
  target_record_id uuid,
  max_rows int default 10
)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  author_user_id uuid,
  author_display_name text
)
language sql
security definer
set search_path = public
as $$
  select
    rc.id,
    rc.body,
    rc.created_at,
    rc.author_user_id,
    coalesce(fm.display_name, '保護者') as author_display_name
  from public.record_comments rc
  join public.reading_records rr
    on rr.id = rc.record_id
   and rr.id = target_record_id
   and rr.child_id = target_child_id
  left join public.family_members fm
    on fm.family_id = rr.family_id
   and fm.user_id = rc.author_user_id
  order by rc.created_at desc
  limit greatest(max_rows, 1);
$$;

create or replace function public.get_kid_record_reactions(
  target_child_id uuid,
  target_record_id uuid
)
returns table (
  emoji text,
  user_id uuid,
  parent_display_name text
)
language sql
security definer
set search_path = public
as $$
  select
    rrx.emoji,
    rrx.user_id,
    coalesce(fm.display_name, '保護者') as parent_display_name
  from public.record_reactions rrx
  join public.reading_records rr
    on rr.id = rrx.record_id
   and rr.id = target_record_id
   and rr.child_id = target_child_id
  left join public.family_members fm
    on fm.family_id = rr.family_id
   and fm.user_id = rrx.user_id;
$$;

create or replace function public.mark_kid_message_read(
  target_child_id uuid,
  target_comment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.record_comments rc
    join public.reading_records rr on rr.id = rc.record_id
    where rc.id = target_comment_id
      and rr.child_id = target_child_id
  ) then
    insert into public.child_message_views (child_id, comment_id, viewed_at)
    values (target_child_id, target_comment_id, now())
    on conflict (child_id, comment_id)
    do update set viewed_at = excluded.viewed_at;

    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.get_kid_messages(uuid, int) from public;
revoke all on function public.get_kid_record_detail(uuid, uuid) from public;
revoke all on function public.get_kid_record_comments(uuid, uuid, int) from public;
revoke all on function public.get_kid_record_reactions(uuid, uuid) from public;
revoke all on function public.mark_kid_message_read(uuid, uuid) from public;

grant execute on function public.get_kid_messages(uuid, int) to service_role;
grant execute on function public.get_kid_record_detail(uuid, uuid) to service_role;
grant execute on function public.get_kid_record_comments(uuid, uuid, int) to service_role;
grant execute on function public.get_kid_record_reactions(uuid, uuid) to service_role;
grant execute on function public.mark_kid_message_read(uuid, uuid) to service_role;
