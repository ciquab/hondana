-- Step 3.5 Milestone A: ジャンル別バッジの定義追加と evaluate_kid_badges 更新

-- バッジ定義の追加
insert into public.badges (id, name, description, icon, sort_order)
values
  ('first_story',  'はじめての物語',  '物語や小説をはじめて読んだ！',          '📖', 50),
  ('three_genres', '3ジャンル制覇！', '3つのちがうジャンルの本を読んだ！',      '🌈', 51),
  ('story_five',   '物語マスター',    '物語・小説を5冊読んだ！',                '✨', 52)
on conflict (id) do update
set
  name        = excluded.name,
  description = excluded.description,
  icon        = excluded.icon,
  sort_order  = excluded.sort_order;

-- evaluate_kid_badges にジャンルバッジ判定を追加（引数シグネチャ変更なし → CREATE OR REPLACE）
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
  v_total_records  int;
  v_streak         int;
  v_feelings       int;
  v_story_count    int;
  v_genre_count    int;
begin
  -- 通算記録数
  select count(*)::int
    into v_total_records
  from public.reading_records
  where child_id = target_child_id;

  -- 最長連続記録日数
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

  -- 気持ちタグ種類数
  select count(distinct tag)::int
    into v_feelings
  from public.record_feeling_tags
  where child_id = target_child_id;

  -- 物語ジャンルの記録数
  select count(*)::int
    into v_story_count
  from public.reading_records
  where child_id = target_child_id
    and genre = 'story';

  -- 記録済みジャンルの種類数（null は除く）
  select count(distinct genre)::int
    into v_genre_count
  from public.reading_records
  where child_id = target_child_id
    and genre is not null;

  -- バッジ付与（重複は unique 制約で無視）
  insert into public.child_badges (child_id, badge_id, source_record_id)
  select target_child_id, badge_id, target_source_record_id
  from (
    values
      ('first_book',        v_total_records  >= 1),
      ('ten_books',         v_total_records  >= 10),
      ('seven_day_streak',  v_streak         >= 7),
      ('many_feelings',     v_feelings       >= 10),
      ('first_story',       v_story_count    >= 1),
      ('three_genres',      v_genre_count    >= 3),
      ('story_five',        v_story_count    >= 5)
  ) as award(badge_id, should_award)
  where should_award
  on conflict (child_id, badge_id) do nothing;
end;
$$;
