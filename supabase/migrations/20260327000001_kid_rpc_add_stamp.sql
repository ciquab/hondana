-- get_kid_recent_records に stamp カラムを追加
-- 前提: 20260308000001_step3_milestone_a.sql で record_reactions_child が作成済み
--       20260326000002_kid_rpc_genre.sql で genre 列が追加済み
-- RETURNS TABLE の列変更のため DROP → RECREATE + GRANT 付け直し

drop function if exists public.get_kid_recent_records(uuid, int);

create or replace function public.get_kid_recent_records(
  target_child_id uuid,
  max_rows int default 50
)
returns table (
  id uuid,
  created_at timestamptz,
  title text,
  cover_url text,
  genre text,
  stamp text
)
language sql
security definer
set search_path = public
as $$
  select
    rr.id,
    rr.created_at,
    b.title,
    b.cover_url,
    rr.genre,
    rrc.stamp
  from public.reading_records rr
  left join public.books b on b.id = rr.book_id
  left join public.record_reactions_child rrc
    on rrc.record_id = rr.id and rrc.child_id = target_child_id
  where rr.child_id = target_child_id
  order by rr.created_at desc
  limit greatest(max_rows, 1);
$$;

revoke all on function public.get_kid_recent_records(uuid, int) from public;
grant execute on function public.get_kid_recent_records(uuid, int) to service_role;
grant execute on function public.get_kid_recent_records(uuid, int) to child_session;
