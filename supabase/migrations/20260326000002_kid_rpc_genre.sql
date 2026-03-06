-- Step 3.5 Milestone A: RPC をジャンル対応に更新
--
-- 変更点:
--   1. create_kid_reading_record に target_genre を追加（シグネチャ変更 → DROP → RECREATE）
--   2. get_kid_recent_records の返却カラムに genre を追加（シグネチャ変更なし → CREATE OR REPLACE）

-- 1. create_kid_reading_record（シグネチャが変わるため DROP してから再作成）
drop function if exists public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[], text, date);

create or replace function public.create_kid_reading_record(
  target_child_id    uuid,
  target_title       text,
  target_author      text    default null,
  target_isbn13      text    default null,
  target_cover_url   text    default null,
  target_status      text    default 'finished',
  target_stamp       text    default null,
  target_feeling_tags text[] default '{}'::text[],
  target_memo        text    default null,
  target_finished_on date    default null,
  target_genre       text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id  uuid;
  v_creator_id uuid;
  v_book_id    uuid;
  v_record_id  uuid;
begin
  select c.family_id, f.created_by
    into v_family_id, v_creator_id
  from public.children c
  join public.families f on f.id = c.family_id
  where c.id = target_child_id
  limit 1;

  if v_family_id is null or v_creator_id is null then
    return null;
  end if;

  if nullif(target_isbn13, '') is not null then
    select b.id
      into v_book_id
    from public.books b
    where b.isbn13 = target_isbn13
    limit 1;
  end if;

  if v_book_id is null then
    insert into public.books (title, author, isbn13, cover_url)
    values (
      target_title,
      nullif(target_author, ''),
      nullif(target_isbn13, ''),
      nullif(target_cover_url, '')
    )
    returning id into v_book_id;
  end if;

  insert into public.reading_records
    (family_id, child_id, book_id, status, memo, finished_on, created_by, genre)
  values (
    v_family_id,
    target_child_id,
    v_book_id,
    target_status,
    nullif(target_memo, ''),
    target_finished_on,
    v_creator_id,
    nullif(target_genre, '')
  )
  returning id into v_record_id;

  if nullif(target_stamp, '') is not null then
    insert into public.record_reactions_child (record_id, child_id, stamp)
    values (v_record_id, target_child_id, target_stamp);
  end if;

  if coalesce(array_length(target_feeling_tags, 1), 0) > 0 then
    insert into public.record_feeling_tags (record_id, child_id, tag)
    select v_record_id, target_child_id, t.tag
    from unnest(target_feeling_tags) as t(tag)
    where nullif(t.tag, '') is not null;
  end if;

  return v_record_id;
end;
$$;

revoke all on function public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[], text, date, text) from public;
grant execute on function public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[], text, date, text) to service_role;
grant execute on function public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[], text, date, text) to child_session;

-- 2. get_kid_recent_records に genre を追加（引数シグネチャ変更なし → GRANT 不要）
create or replace function public.get_kid_recent_records(
  target_child_id uuid,
  max_rows int default 50
)
returns table (
  id uuid,
  created_at timestamptz,
  title text,
  cover_url text,
  genre text
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
    rr.genre
  from public.reading_records rr
  left join public.books b on b.id = rr.book_id
  where rr.child_id = target_child_id
  order by rr.created_at desc
  limit greatest(max_rows, 1);
$$;
