-- 3.8-2: ダッシュボードアクション用 RPC

-- 1. 未コメント記録を取得（直近7日、子ども別）
create or replace function public.get_uncommented_records_for_children(
  target_child_ids uuid[],
  max_rows int default 3
)
returns table (
  record_id uuid,
  child_id uuid,
  child_name text,
  book_title text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rr.id as record_id,
    rr.child_id,
    c.display_name as child_name,
    b.title as book_title,
    rr.created_at
  from public.reading_records rr
  join public.children c on c.id = rr.child_id
  join public.books b on b.id = rr.book_id
  left join public.record_comments rc on rc.record_id = rr.id
  where rr.child_id = any(target_child_ids)
    and rr.created_at >= now() - interval '7 days'
    and rc.id is null
  order by rr.created_at desc
  limit max_rows;
$$;

-- 2. 今週記録なしの子どもを取得
create or replace function public.get_children_without_records_this_week(
  target_child_ids uuid[]
)
returns table (
  child_id uuid,
  child_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id as child_id, c.display_name as child_name
  from public.children c
  where c.id = any(target_child_ids)
    and not exists (
      select 1 from public.reading_records rr
      where rr.child_id = c.id
        and rr.created_at >= date_trunc('week', now())
    );
$$;

-- 3. 今週のハイライト（スタンプ最高値の1件/子ども）
create or replace function public.get_weekly_highlight_for_child(
  target_child_id uuid
)
returns table (
  record_id uuid,
  book_title text,
  cover_url text,
  stamp text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rr.id as record_id,
    b.title as book_title,
    b.cover_url,
    rrc.stamp
  from public.reading_records rr
  join public.books b on b.id = rr.book_id
  join public.record_reactions_child rrc on rrc.record_id = rr.id and rrc.child_id = rr.child_id
  where rr.child_id = target_child_id
    and rr.created_at >= date_trunc('week', now())
  order by
    case rrc.stamp
      when 'great' then 1
      when 'fun' then 2
      when 'ok' then 3
      when 'hard' then 4
    end,
    rr.created_at desc
  limit 1;
$$;

-- 4. ミッションアラート（残り2日以内で未達成）
create or replace function public.get_mission_alerts_for_children(
  target_child_ids uuid[]
)
returns table (
  child_id uuid,
  child_name text,
  mission_title text,
  current_progress int,
  target_value int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.child_id,
    c.display_name as child_name,
    mt.title as mission_title,
    cm.current_progress,
    mt.target_value
  from public.child_missions cm
  join public.children c on c.id = cm.child_id
  join public.mission_templates mt on mt.id = cm.template_id
  where cm.child_id = any(target_child_ids)
    and cm.status = 'active'
    and cm.ends_at <= now() + interval '2 days'
    and cm.current_progress < mt.target_value;
$$;

-- 権限付与
grant execute on function public.get_uncommented_records_for_children(uuid[], int) to authenticated;
grant execute on function public.get_children_without_records_this_week(uuid[]) to authenticated;
grant execute on function public.get_weekly_highlight_for_child(uuid) to authenticated;
grant execute on function public.get_mission_alerts_for_children(uuid[]) to authenticated;
