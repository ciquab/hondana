-- Day1 foundation: families, family_members, children + minimal family-bound RLS

create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'parent')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  birth_year int,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_children_family_id on public.children(family_id);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
  );
$$;

-- families policies
create policy "family_members_can_view_family"
on public.families
for select
using (public.is_family_member(id));

create policy "authenticated_can_create_family"
on public.families
for insert
to authenticated
with check (true);

-- family_members policies
create policy "family_members_can_view_members"
on public.family_members
for select
using (public.is_family_member(family_id));

create policy "member_can_insert_self"
on public.family_members
for insert
to authenticated
with check (user_id = auth.uid());

-- children policies
create policy "family_members_can_view_children"
on public.children
for select
using (public.is_family_member(family_id));

create policy "family_members_can_create_children"
on public.children
for insert
to authenticated
with check (public.is_family_member(family_id));
