-- Step 3 Milestone B: badges + reading calendar foundation

create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.child_badges (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  source_record_id uuid references public.reading_records(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (child_id, badge_id)
);

create index if not exists idx_child_badges_child_awarded_at
  on public.child_badges(child_id, awarded_at desc);

alter table public.badges enable row level security;
alter table public.child_badges enable row level security;

create policy "anyone can read badges"
  on public.badges for select
  using (true);

create policy "family members can view child badges"
  on public.child_badges for select
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "family members can insert child badges"
  on public.child_badges for insert
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );

insert into public.badges (id, name, description, icon, sort_order)
values
  ('first_book', 'はじめての1冊', '最初の読書記録をつけた', '📘', 10),
  ('ten_books', '10冊達成', '読書記録を10冊達成した', '🏅', 20),
  ('seven_day_streak', '7日れんぞく', '7日連続で読書記録をつけた', '🔥', 30),
  ('many_feelings', 'きもちマスター', '10種類以上の気持ちタグを使った', '🌈', 40)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
