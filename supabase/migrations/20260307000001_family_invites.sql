-- Family invitation system: allows a second parent to join an existing family

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_invites_code on public.family_invites(invite_code);

alter table public.family_invites enable row level security;

-- Family members can view their family's invites (for the settings page)
create policy "family_members_can_view_invites"
on public.family_invites
for select
using (public.is_family_member(family_id));

-- RPC to create an invite code (security definer bypasses RLS)
create or replace function public.create_family_invite(target_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not public.is_family_member(target_family_id) then
    raise exception 'Not a member of this family';
  end if;

  new_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));

  insert into public.family_invites (family_id, invite_code, created_by, expires_at)
  values (target_family_id, new_code, auth.uid(), now() + interval '48 hours');

  return new_code;
end;
$$;

-- RPC to accept an invite code (security definer bypasses RLS)
create or replace function public.accept_family_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record record;
begin
  select * into invite_record
  from public.family_invites
  where invite_code = upper(trim(code))
    and used_by is null
    and expires_at > now();

  if invite_record is null then
    raise exception 'Invalid or expired invite code';
  end if;

  if exists (
    select 1 from public.family_members
    where family_id = invite_record.family_id
      and user_id = auth.uid()
  ) then
    raise exception 'Already a member of this family';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (invite_record.family_id, auth.uid(), 'parent');

  update public.family_invites
  set used_by = auth.uid(), used_at = now()
  where id = invite_record.id;

  return invite_record.family_id;
end;
$$;
