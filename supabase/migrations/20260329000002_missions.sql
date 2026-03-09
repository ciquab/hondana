-- 3.8-1: ミッション機能の基盤テーブル・RPC・初期データ

---------------------------------------------------------------------
-- 1. mission_templates（システム定義テンプレート）
---------------------------------------------------------------------
create table public.mission_templates (
  id          text primary key,
  title       text not null,
  description text,
  target_type text not null check (target_type in ('genre_count', 'total_count', 'streak_days', 'new_genre')),
  target_genre text,
  target_value int not null,
  period      text not null default 'weekly' check (period in ('weekly', 'monthly')),
  difficulty  text not null default 'normal' check (difficulty in ('easy', 'normal', 'challenge')),
  icon        text not null default '📖',
  sort_order  int not null default 0
);

-- テンプレートは全ユーザーに公開（読み取りのみ）
alter table public.mission_templates enable row level security;
create policy "anyone can read templates" on public.mission_templates
  for select using (true);

-- 初期テンプレート
insert into public.mission_templates (id, title, description, target_type, target_genre, target_value, difficulty, icon, sort_order) values
  ('story_1',    'ものがたりを 1さつ よもう',         'ものがたりの ほんを 1さつ よんでみよう！',     'genre_count',  'story', 1, 'easy',      '📖', 1),
  ('any_3',      'なんでも 3さつ よもう',             'すきなほんを 3さつ よんでみよう！',            'total_count',  null,    3, 'easy',      '📚', 2),
  ('read_aloud', 'よみきかせを 3かい きろくしよう',   'よんでもらったほんも きろくしよう！',           'total_count',  null,    3, 'easy',      '👂', 3),
  ('story_3',    'ものがたりを 3さつ よもう',         'ものがたりの ほんを 3さつ よめるかな？',       'genre_count',  'story', 3, 'normal',    '📖', 4),
  ('streak_3',   '3にち れんぞく よもう',             '3にち つづけて きろくしよう！',                 'streak_days',  null,    3, 'normal',    '🔥', 5),
  ('any_5',      '5さつ チャレンジ',                  '1しゅうかんで 5さつ よめるかな？',             'total_count',  null,    5, 'normal',    '📚', 6),
  ('new_genre',  'あたらしいジャンルに チャレンジ',   'まだよんだことない ジャンルの ほんを よもう！',  'new_genre',    null,    1, 'challenge', '🌟', 7);

---------------------------------------------------------------------
-- 2. child_missions（子どもに割り当てられたミッション）
---------------------------------------------------------------------
create table public.child_missions (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references public.children(id) on delete cascade,
  family_id        uuid not null references public.families(id) on delete cascade,
  template_id      text not null references public.mission_templates(id),
  started_at       timestamptz not null default now(),
  ends_at          timestamptz not null,
  status           text not null default 'active'
    check (status in ('active', 'completed', 'expired')),
  current_progress int not null default 0,
  completed_at     timestamptz,
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now()
);

alter table public.child_missions enable row level security;

create policy "family members can manage missions" on public.child_missions
  for all using (
    family_id in (
      select family_id from public.family_members where user_id = auth.uid()
    )
  );

-- child_session ロールからの読み取りを許可
create policy "child can read own missions" on public.child_missions
  for select using (
    child_id = current_setting('app.child_id', true)::uuid
  );

-- インデックス
create index idx_child_missions_child_active on public.child_missions (child_id, status)
  where status = 'active';

---------------------------------------------------------------------
-- 3. ミッション設定 RPC（親用）
---------------------------------------------------------------------
create or replace function public.set_child_mission(
  target_child_id uuid,
  target_template_id text,
  target_family_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
begin
  -- 権限チェック: 呼び出し元が family_id のメンバーであること
  if not exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  ) then
    raise exception 'Permission denied';
  end if;

  -- 既存 active ミッションを expired に
  update public.child_missions
  set status = 'expired'
  where child_id = target_child_id
    and status = 'active';

  -- 新規ミッション作成（期間: 7日）
  insert into public.child_missions (child_id, family_id, template_id, ends_at, created_by)
  values (
    target_child_id,
    target_family_id,
    target_template_id,
    now() + interval '7 days',
    auth.uid()
  )
  returning id into v_mission_id;

  return v_mission_id;
end;
$$;

---------------------------------------------------------------------
-- 4. ミッション進捗更新 RPC
---------------------------------------------------------------------
create or replace function public.update_mission_progress(
  target_child_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission       record;
  v_template      record;
  v_progress      int := 0;
  v_period_start  timestamptz;
begin
  -- active なミッションを取得
  select * into v_mission
  from public.child_missions
  where child_id = target_child_id and status = 'active'
  order by created_at desc limit 1;

  if not found then return; end if;

  -- 期限切れチェック
  if v_mission.ends_at < now() then
    update public.child_missions set status = 'expired'
    where id = v_mission.id;
    return;
  end if;

  -- テンプレート情報取得
  select * into v_template
  from public.mission_templates
  where id = v_mission.template_id;

  v_period_start := v_mission.started_at;

  -- target_type に応じた進捗計算
  case v_template.target_type
    when 'genre_count' then
      select count(*)::int into v_progress
      from public.reading_records
      where child_id = target_child_id
        and created_at >= v_period_start
        and genre = v_template.target_genre
        and status in ('finished', 'read_aloud');

    when 'total_count' then
      select count(*)::int into v_progress
      from public.reading_records
      where child_id = target_child_id
        and created_at >= v_period_start
        and status in ('finished', 'read_aloud');

    when 'streak_days' then
      with per_day as (
        select distinct date_trunc('day', created_at)::date as d
        from public.reading_records
        where child_id = target_child_id
          and created_at >= v_period_start
      ), streak_calc as (
        select d, d - (row_number() over (order by d))::int as grp
        from per_day
      )
      select coalesce(max(cnt), 0) into v_progress
      from (select count(*)::int as cnt from streak_calc group by grp) s;

    when 'new_genre' then
      -- ミッション開始前に記録済みのジャンルを除いた新ジャンル数
      select count(distinct rr.genre)::int into v_progress
      from public.reading_records rr
      where rr.child_id = target_child_id
        and rr.created_at >= v_period_start
        and rr.genre is not null
        and rr.genre not in (
          select distinct r2.genre
          from public.reading_records r2
          where r2.child_id = target_child_id
            and r2.created_at < v_period_start
            and r2.genre is not null
        );
  end case;

  -- 進捗更新 + 達成判定
  update public.child_missions
  set current_progress = v_progress,
      status = case when v_progress >= v_template.target_value then 'completed' else 'active' end,
      completed_at = case when v_progress >= v_template.target_value and completed_at is null then now() else completed_at end
  where id = v_mission.id;
end;
$$;

---------------------------------------------------------------------
-- 5. 子どもセッション用: アクティブミッション取得 RPC
---------------------------------------------------------------------
create or replace function public.get_kid_active_mission(
  target_child_id uuid
)
returns table (
  mission_id uuid,
  template_id text,
  title text,
  description text,
  icon text,
  target_value int,
  current_progress int,
  status text,
  ends_at timestamptz,
  started_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.id as mission_id,
    cm.template_id,
    mt.title,
    mt.description,
    mt.icon,
    mt.target_value,
    cm.current_progress,
    cm.status,
    cm.ends_at,
    cm.started_at
  from public.child_missions cm
  join public.mission_templates mt on mt.id = cm.template_id
  where cm.child_id = target_child_id
    and cm.status in ('active', 'completed')
  order by cm.created_at desc
  limit 1;
$$;

---------------------------------------------------------------------
-- 6. 権限付与
---------------------------------------------------------------------
-- 親（authenticated）用
grant select on public.mission_templates to authenticated;
grant select, insert, update on public.child_missions to authenticated;
grant execute on function public.set_child_mission(uuid, text, uuid) to authenticated;

-- 子どもセッション用
grant select on public.mission_templates to child_session;
grant select on public.child_missions to child_session;
grant execute on function public.get_kid_active_mission(uuid) to child_session;
grant execute on function public.update_mission_progress(uuid) to child_session;
grant execute on function public.update_mission_progress(uuid) to authenticated;
