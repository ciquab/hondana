-- 3.8-4: get_kid_suggestions に isbn13 を追加
-- 返却型が変わるため DROP が必要
drop function if exists public.get_kid_suggestions(uuid);

create function public.get_kid_suggestions(target_child_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  title text,
  author text,
  isbn13 text,
  cover_url text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select
    rs.id,
    rs.created_at,
    b.title,
    b.author,
    b.isbn13,
    b.cover_url,
    rs.status
  from public.reading_suggestions rs
  join public.books b on b.id = rs.book_id
  where rs.child_id = target_child_id
    and rs.status = 'pending'
  order by rs.created_at desc
  limit 20;
$$;

-- 権限を再付与（DROP で失われるため）
revoke all on function public.get_kid_suggestions(uuid) from public;
grant execute on function public.get_kid_suggestions(uuid) to service_role;
grant execute on function public.get_kid_suggestions(uuid) to child_session;
