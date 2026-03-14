-- 子どもが自分の読書記録を編集できる RPC を追加。
-- また get_kid_record_detail に genre を追加（返却型変更のため DROP → RECREATE）。

-- 1. get_kid_record_detail に genre を追加
drop function if exists public.get_kid_record_detail(uuid, uuid);

create or replace function public.get_kid_record_detail(
  target_child_id  uuid,
  target_record_id uuid
)
returns table (
  id                 uuid,
  created_at         timestamptz,
  status             text,
  memo               text,
  finished_on        date,
  genre              text,
  child_display_name text,
  title              text,
  author             text,
  isbn13             text,
  cover_url          text,
  stamp              text,
  feeling_tags       text[]
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
    rr.genre,
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
   and rrc.child_id  = rr.child_id
  left join public.record_feeling_tags rft
    on rft.record_id = rr.id
   and rft.child_id  = rr.child_id
  where rr.id        = target_record_id
    and rr.child_id  = target_child_id
  group by rr.id, c.display_name, b.title, b.author, b.isbn13, b.cover_url, rrc.stamp
  limit 1;
$$;

revoke all on function public.get_kid_record_detail(uuid, uuid) from public;
grant execute on function public.get_kid_record_detail(uuid, uuid) to service_role;
grant execute on function public.get_kid_record_detail(uuid, uuid) to child_session;

-- 2. update_kid_reading_record RPC
--    スタンプ・読了状況・ジャンル・きもちタグ・メモ・読んだ日を更新する。
--    本の情報（タイトル等）は books テーブルで複数記録に共有されるため対象外。
create or replace function public.update_kid_reading_record(
  target_child_id    uuid,
  target_record_id   uuid,
  target_status      text    default 'finished',
  target_stamp       text    default null,
  target_feeling_tags text[] default '{}'::text[],
  target_memo        text    default null,
  target_finished_on date    default null,
  target_genre       text    default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 所有権チェック：自分の記録でなければ false を返す
  if not exists (
    select 1
    from public.reading_records
    where id       = target_record_id
      and child_id = target_child_id
  ) then
    return false;
  end if;

  -- reading_records を更新
  update public.reading_records
  set
    status      = target_status,
    memo        = nullif(target_memo, ''),
    finished_on = target_finished_on,
    genre       = nullif(target_genre, '')
  where id       = target_record_id
    and child_id = target_child_id;

  -- スタンプを upsert（record_reactions_child）
  if nullif(target_stamp, '') is not null then
    insert into public.record_reactions_child (record_id, child_id, stamp)
    values (target_record_id, target_child_id, target_stamp)
    on conflict (record_id, child_id)
    do update set stamp = excluded.stamp;
  else
    delete from public.record_reactions_child
    where record_id = target_record_id
      and child_id  = target_child_id;
  end if;

  -- きもちタグを洗い替え
  delete from public.record_feeling_tags
  where record_id = target_record_id
    and child_id  = target_child_id;

  if coalesce(array_length(target_feeling_tags, 1), 0) > 0 then
    insert into public.record_feeling_tags (record_id, child_id, tag)
    select target_record_id, target_child_id, t.tag
    from unnest(target_feeling_tags) as t(tag)
    where nullif(t.tag, '') is not null;
  end if;

  return true;
end;
$$;

revoke all on function public.update_kid_reading_record(uuid, uuid, text, text, text[], text, date, text) from public;
grant execute on function public.update_kid_reading_record(uuid, uuid, text, text, text[], text, date, text) to service_role;
grant execute on function public.update_kid_reading_record(uuid, uuid, text, text, text[], text, date, text) to child_session;
