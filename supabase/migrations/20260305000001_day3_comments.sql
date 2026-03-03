-- Day3: record_comments table with RLS

---------------------------------------------------------------------
-- 1. record_comments (family-scoped)
---------------------------------------------------------------------
create table public.record_comments (
  id              uuid primary key default gen_random_uuid(),
  record_id       uuid not null references public.reading_records on delete cascade,
  family_id       uuid not null references public.families on delete cascade,
  author_user_id  uuid not null,
  body            text not null check (char_length(body) between 1 and 500),
  created_at      timestamptz not null default now()
);

create index idx_record_comments_record_created
  on public.record_comments (record_id, created_at);

-- RLS
alter table public.record_comments enable row level security;

create policy "Family members can view comments"
  on public.record_comments for select
  using (public.is_family_member(family_id));

create policy "Family members can create comments"
  on public.record_comments for insert
  with check (
    public.is_family_member(family_id)
    and author_user_id = auth.uid()
  );

create policy "Comment author can delete"
  on public.record_comments for delete
  using (
    public.is_family_member(family_id)
    and author_user_id = auth.uid()
  );
