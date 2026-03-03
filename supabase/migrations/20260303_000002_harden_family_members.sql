-- Harden family_members insert policy to prevent joining arbitrary families

alter table public.families
add column if not exists created_by uuid not null default auth.uid();

drop policy if exists "authenticated_can_create_family" on public.families;
create policy "authenticated_can_create_family"
on public.families
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "member_can_insert_self" on public.family_members;
create policy "creator_can_insert_self_as_member"
on public.family_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.families f
    where f.id = family_id
      and f.created_by = auth.uid()
  )
);
