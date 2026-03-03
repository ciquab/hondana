-- Atomic family creation: insert family + owner member in a single transaction
-- Replaces the two-step insert in the server action to prevent orphan family rows.

create or replace function public.create_family_with_owner(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
begin
  insert into public.families (name, created_by)
  values (family_name, auth.uid())
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, auth.uid(), 'owner');

  return new_family_id;
end;
$$;
