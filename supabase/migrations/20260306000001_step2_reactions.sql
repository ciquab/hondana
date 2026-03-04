-- Step 2: record_reactions table (likes/reactions on reading records)

create table public.record_reactions (
  id              uuid primary key default gen_random_uuid(),
  record_id       uuid not null references public.reading_records on delete cascade,
  family_id       uuid not null references public.families on delete cascade,
  user_id         uuid not null,
  emoji           text not null check (emoji in ('heart', 'thumbsup', 'star', 'clap')),
  created_at      timestamptz not null default now(),
  -- One reaction type per user per record
  unique (record_id, user_id, emoji)
);

create index idx_record_reactions_record
  on public.record_reactions (record_id);

-- RLS
alter table public.record_reactions enable row level security;

create policy "Family members can view reactions"
  on public.record_reactions for select
  using (public.is_family_member(family_id));

create policy "Family members can add reactions"
  on public.record_reactions for insert
  with check (
    public.is_family_member(family_id)
    and user_id = auth.uid()
  );

create policy "User can remove own reactions"
  on public.record_reactions for delete
  using (
    public.is_family_member(family_id)
    and user_id = auth.uid()
  );
