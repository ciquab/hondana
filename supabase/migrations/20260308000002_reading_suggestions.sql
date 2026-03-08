-- 親からのおすすめ機能: reading_suggestions テーブル
-- 親が子どもに「読んでほしい本」を送信する専用テーブル

create table if not exists public.reading_suggestions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  suggested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists idx_reading_suggestions_child_id on public.reading_suggestions(child_id);
create index if not exists idx_reading_suggestions_family_id on public.reading_suggestions(family_id);

alter table public.reading_suggestions enable row level security;

-- 親（family_member）は自分の family の suggestions を参照・作成できる
create policy "family members can manage suggestions"
  on public.reading_suggestions
  for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- 子ども側 RPC: get_kid_suggestions
create or replace function public.get_kid_suggestions(target_child_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  title text,
  author text,
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
    b.cover_url,
    rs.status
  from public.reading_suggestions rs
  join public.books b on b.id = rs.book_id
  where rs.child_id = target_child_id
    and rs.status = 'pending'
  order by rs.created_at desc
  limit 20;
$$;

revoke all on function public.get_kid_suggestions(uuid) from public;
grant execute on function public.get_kid_suggestions(uuid) to service_role;
grant execute on function public.get_kid_suggestions(uuid) to child_session;

-- 親側 RPC: suggest_book_to_child（書籍情報を受け取り books + suggestions に insert）
create or replace function public.suggest_book_to_child(
  target_child_id uuid,
  target_title     text,
  target_author    text    default null,
  target_isbn13    text    default null,
  target_cover_url text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_book_id   uuid;
  v_sug_id    uuid;
begin
  select c.family_id into v_family_id
  from public.children c
  where c.id = target_child_id
  limit 1;

  if v_family_id is null then return null; end if;

  -- 既存本の検索（ISBN で重複回避）
  if nullif(target_isbn13, '') is not null then
    select b.id into v_book_id from public.books b where b.isbn13 = target_isbn13 limit 1;
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

  insert into public.reading_suggestions (family_id, child_id, book_id, suggested_by)
  values (v_family_id, target_child_id, v_book_id, auth.uid())
  returning id into v_sug_id;

  return v_sug_id;
end;
$$;

revoke all on function public.suggest_book_to_child(uuid, text, text, text, text) from public;
grant execute on function public.suggest_book_to_child(uuid, text, text, text, text) to authenticated;
