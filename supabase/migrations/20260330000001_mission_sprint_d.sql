-- 3.9-7/3.9-8: ミッション可変設定（期間・目標値）

alter table public.child_missions
  add column if not exists duration_days int not null default 7 check (duration_days in (7, 14)),
  add column if not exists target_value int;

update public.child_missions cm
set target_value = mt.target_value
from public.mission_templates mt
where cm.template_id = mt.id
  and cm.target_value is null;

alter table public.child_missions
  alter column target_value set not null;

alter table public.child_missions
  alter column target_value set default 1;

-- 旧シグネチャを削除して新シグネチャへ統一
DROP FUNCTION IF EXISTS public.set_child_mission(uuid, text, uuid);

create or replace function public.set_child_mission(
  target_child_id uuid,
  target_template_id text,
  target_family_id uuid,
  duration_days int default 7,
  custom_target_value int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_template_target_value int;
  v_duration int;
  v_target_value int;
begin
  if not exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  ) then
    raise exception 'Permission denied';
  end if;

  select target_value into v_template_target_value
  from public.mission_templates
  where id = target_template_id;

  if v_template_target_value is null then
    raise exception 'Template not found';
  end if;

  v_duration := case when duration_days = 14 then 14 else 7 end;
  v_target_value := coalesce(custom_target_value, v_template_target_value);

  if v_target_value < 1 or v_target_value > 20 then
    raise exception 'Invalid target value';
  end if;

  update public.child_missions
  set status = 'expired'
  where child_id = target_child_id
    and status = 'active';

  insert into public.child_missions (
    child_id,
    family_id,
    template_id,
    ends_at,
    duration_days,
    target_value,
    created_by
  )
  values (
    target_child_id,
    target_family_id,
    target_template_id,
    now() + make_interval(days => v_duration),
    v_duration,
    v_target_value,
    auth.uid()
  )
  returning id into v_mission_id;

  return v_mission_id;
end;
$$;

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
  v_target_value  int;
begin
  select * into v_mission
  from public.child_missions
  where child_id = target_child_id and status = 'active'
  order by created_at desc limit 1;

  if not found then return; end if;

  if v_mission.ends_at < now() then
    update public.child_missions set status = 'expired'
    where id = v_mission.id;
    return;
  end if;

  select * into v_template
  from public.mission_templates
  where id = v_mission.template_id;

  v_period_start := v_mission.started_at;
  v_target_value := coalesce(v_mission.target_value, v_template.target_value);

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

  update public.child_missions
  set current_progress = v_progress,
      status = case when v_progress >= v_target_value then 'completed' else 'active' end,
      completed_at = case when v_progress >= v_target_value and completed_at is null then now() else completed_at end
  where id = v_mission.id;
end;
$$;

DROP FUNCTION IF EXISTS public.get_kid_active_mission(uuid);

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
  started_at timestamptz,
  duration_days int
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
    cm.target_value,
    cm.current_progress,
    cm.status,
    cm.ends_at,
    cm.started_at,
    cm.duration_days
  from public.child_missions cm
  join public.mission_templates mt on mt.id = cm.template_id
  where cm.child_id = target_child_id
    and cm.status in ('active', 'completed')
  order by cm.created_at desc
  limit 1;
$$;

grant execute on function public.set_child_mission(uuid, text, uuid, int, int) to authenticated;
grant execute on function public.get_kid_active_mission(uuid) to child_session;
grant execute on function public.update_mission_progress(uuid) to child_session;
grant execute on function public.update_mission_progress(uuid) to authenticated;
