-- Step 3 Milestone C: family invite improvements (revoke + active invite query)

alter table public.family_invites
  add column if not exists revoked_at timestamptz;

create index if not exists idx_family_invites_active
  on public.family_invites(family_id, created_at desc)
  where used_by is null and revoked_at is null;

create or replace function public.get_active_family_invites(target_family_id uuid)
returns table (
  id uuid,
  invite_code text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select fi.id, fi.invite_code, fi.expires_at, fi.created_at
  from public.family_invites fi
  where fi.family_id = target_family_id
    and fi.used_by is null
    and fi.revoked_at is null
    and fi.expires_at > now()
    and public.is_family_member(fi.family_id)
  order by fi.created_at desc;
$$;

create or replace function public.revoke_family_invite(target_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_family_id uuid;
begin
  select family_id into invite_family_id
  from public.family_invites
  where id = target_invite_id;

  if invite_family_id is null then
    return false;
  end if;

  if not public.is_family_member(invite_family_id) then
    raise exception 'Not a member of this family';
  end if;

  update public.family_invites
  set revoked_at = now()
  where id = target_invite_id
    and used_by is null
    and revoked_at is null;

  return found;
end;
$$;

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
    and revoked_at is null
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
