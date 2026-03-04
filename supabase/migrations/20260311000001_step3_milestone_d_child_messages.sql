-- Step 3 Milestone D: child message inbox + read tracking

create table if not exists public.child_message_views (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  comment_id uuid not null references public.record_comments(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (child_id, comment_id)
);

create index if not exists idx_child_message_views_child
  on public.child_message_views(child_id, viewed_at desc);

alter table public.child_message_views enable row level security;

create policy "family members can view child message views"
  on public.child_message_views for select
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "family members can insert child message views"
  on public.child_message_views for insert
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );
