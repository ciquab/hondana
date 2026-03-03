-- Day2: books + reading_records tables with RLS, triggers, and helper RPC

---------------------------------------------------------------------
-- 1. books (global shared catalog)
---------------------------------------------------------------------
create table public.books (
  id         uuid primary key default gen_random_uuid(),
  isbn13     text unique,
  title      text not null,
  author     text,
  cover_url  text,
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

create policy "Anyone can read books"
  on public.books for select using (true);

create policy "Authenticated users can insert books"
  on public.books for insert
  with check (auth.uid() is not null);

-- partial index for ISBN lookups (skip NULLs)
create index idx_books_isbn13
  on public.books (isbn13) where isbn13 is not null;

---------------------------------------------------------------------
-- 2. reading_records (family-scoped)
---------------------------------------------------------------------
create table public.reading_records (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families on delete cascade,
  child_id    uuid not null references public.children on delete cascade,
  book_id     uuid not null references public.books   on delete cascade,
  status      text not null default 'want_to_read'
              check (status in ('want_to_read', 'reading', 'finished')),
  memo        text,
  finished_on date,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_reading_records_family_child
  on public.reading_records (family_id, child_id, created_at desc);

create index idx_reading_records_book
  on public.reading_records (book_id);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_reading_records_updated_at
  before update on public.reading_records
  for each row execute function public.set_updated_at();

-- RLS
alter table public.reading_records enable row level security;

create policy "Family members can view records"
  on public.reading_records for select
  using (public.is_family_member(family_id));

create policy "Family members can create records"
  on public.reading_records for insert
  with check (
    public.is_family_member(family_id)
    and created_by = auth.uid()
  );

create policy "Family members can update records"
  on public.reading_records for update
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "Record creator can delete"
  on public.reading_records for delete
  using (
    public.is_family_member(family_id)
    and created_by = auth.uid()
  );

---------------------------------------------------------------------
-- 3. Helper RPC: check child belongs to current user's family
---------------------------------------------------------------------
create or replace function public.is_child_in_my_family(target_child_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    join public.family_members fm on fm.family_id = c.family_id
    where c.id = target_child_id
      and fm.user_id = auth.uid()
  );
$$;
