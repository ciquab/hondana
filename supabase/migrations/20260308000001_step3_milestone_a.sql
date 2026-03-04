-- Step 3 Milestone A: child PIN auth + child stamps/tags

create table if not exists public.child_auth_methods (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children(id) on delete cascade,
  pin_hash text,
  pin_failed_count int not null default 0,
  pin_locked_until timestamptz,
  illustration_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_auth_method_required
    check (pin_hash is not null or illustration_secret is not null)
);

create trigger trg_child_auth_methods_updated_at
  before update on public.child_auth_methods
  for each row execute function public.set_updated_at();

create table if not exists public.record_reactions_child (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.reading_records(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  stamp text not null check (stamp in ('great', 'fun', 'ok', 'hard')),
  created_at timestamptz not null default now(),
  unique (record_id, child_id)
);

create index if not exists idx_record_reactions_child_record
  on public.record_reactions_child(record_id);

create table if not exists public.record_feeling_tags (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.reading_records(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (record_id, child_id, tag)
);

create index if not exists idx_record_feeling_tags_record
  on public.record_feeling_tags(record_id);

alter table public.child_auth_methods enable row level security;
alter table public.record_reactions_child enable row level security;
alter table public.record_feeling_tags enable row level security;

create policy "family members can view child auth methods"
  on public.child_auth_methods for select
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "family members can insert child auth methods"
  on public.child_auth_methods for insert
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "family members can update child auth methods"
  on public.child_auth_methods for update
  using (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "family members can manage child reactions"
  on public.record_reactions_child for all
  using (
    exists (
      select 1
      from public.reading_records rr
      where rr.id = record_id
        and rr.child_id = child_id
        and public.is_family_member(rr.family_id)
    )
  )
  with check (
    exists (
      select 1
      from public.reading_records rr
      where rr.id = record_id
        and rr.child_id = child_id
        and public.is_family_member(rr.family_id)
    )
  );

create policy "family members can manage child feeling tags"
  on public.record_feeling_tags for all
  using (
    exists (
      select 1
      from public.reading_records rr
      where rr.id = record_id
        and rr.child_id = child_id
        and public.is_family_member(rr.family_id)
    )
  )
  with check (
    exists (
      select 1
      from public.reading_records rr
      where rr.id = record_id
        and rr.child_id = child_id
        and public.is_family_member(rr.family_id)
    )
  );
