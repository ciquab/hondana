-- Sprint 3: バッジ文言のjunior/standard分岐 + get_kid_badges 拡張

-- badges テーブルに junior 向け文言カラムを追加
alter table public.badges
  add column if not exists junior_name text,
  add column if not exists junior_description text;

-- 既存バッジに junior 文言を設定
update public.badges set
  junior_name = 'はじめての 1さつ',
  junior_description = 'はじめて どくしょきろくを つけたよ！'
where id = 'first_book';

update public.badges set
  junior_name = '10さつ たっせい',
  junior_description = 'どくしょきろくを 10さつ たっせい！'
where id = 'ten_books';

update public.badges set
  junior_name = '7にち れんぞく',
  junior_description = '7にち つづけて どくしょきろくを つけたよ！'
where id = 'seven_day_streak';

update public.badges set
  junior_name = 'きもち マスター',
  junior_description = '10しゅるい いじょうの きもちタグを つかったよ！'
where id = 'many_feelings';

update public.badges set
  junior_name = 'はじめての ものがたり',
  junior_description = 'ものがたりや しょうせつを はじめて よんだよ！'
where id = 'first_story';

update public.badges set
  junior_name = '3ジャンル せいは！',
  junior_description = '3つの ちがう ジャンルの ほんを よんだよ！'
where id = 'three_genres';

update public.badges set
  junior_name = 'ものがたり マスター',
  junior_description = 'ものがたり・しょうせつを 5さつ よんだよ！'
where id = 'story_five';

-- get_kid_badges を拡張して junior 文言を返す（返却型変更のため DROP が必要）
drop function if exists public.get_kid_badges(uuid);
create or replace function public.get_kid_badges(target_child_id uuid)
returns table (
  badge_id text,
  awarded_at timestamptz,
  id text,
  name text,
  description text,
  icon text,
  sort_order int,
  junior_name text,
  junior_description text
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
    b.sort_order,
    b.junior_name,
    b.junior_description
  from public.child_badges cb
  join public.badges b on b.id = cb.badge_id
  where cb.child_id = target_child_id
  order by cb.awarded_at desc;
$$;
