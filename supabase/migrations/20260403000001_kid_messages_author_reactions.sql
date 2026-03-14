-- Add author_display_name and per-user reaction names to get_kid_messages.
-- reactions format changes from {emoji: count} to {emoji: {count, names}}.

-- Drop existing function first because the return type changes (OUT parameters differ).
drop function if exists public.get_kid_messages(uuid, integer);

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
  reactions jsonb,
  author_display_name text
)
language sql
security definer
set search_path = public
as $$
  with kid_records as (
    select rr.id, b.title, rr.family_id
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
      select jsonb_object_agg(
        emoji_data.emoji,
        jsonb_build_object(
          'count', emoji_data.cnt,
          'names', emoji_data.names
        )
      )
      from (
        select
          rrx.emoji,
          count(*)::int as cnt,
          coalesce(
            jsonb_agg(coalesce(fm2.display_name, 'おうちのひと') order by fm2.display_name),
            '[]'::jsonb
          ) as names
        from public.record_reactions rrx
        left join public.family_members fm2
          on fm2.family_id = kr.family_id
         and fm2.user_id = rrx.user_id
        where rrx.record_id = rc.record_id
        group by rrx.emoji
      ) as emoji_data
    ), '{}'::jsonb) as reactions,
    coalesce(fm.display_name, 'おうちのひと') as author_display_name
  from public.record_comments rc
  join kid_records kr on kr.id = rc.record_id
  left join public.family_members fm
    on fm.family_id = kr.family_id
   and fm.user_id = rc.author_user_id
  order by rc.created_at desc
  limit greatest(max_rows, 1);
$$;
