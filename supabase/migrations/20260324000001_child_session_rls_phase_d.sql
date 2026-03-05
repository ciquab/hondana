-- Phase D (prep): child_session claim helpers and RLS scaffold

create or replace function public.jwt_claim_uuid(claim_key text)
returns uuid
language plpgsql
stable
as $$
declare
  raw_claim text;
begin
  raw_claim := nullif(auth.jwt() ->> claim_key, '');
  if raw_claim is null then
    return null;
  end if;

  begin
    return raw_claim::uuid;
  exception
    when others then
      return null;
  end;
end;
$$;

create or replace function public.is_child_session_for(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() ->> 'role', '') = 'child_session'
    and public.jwt_claim_uuid('child_id') = target_child_id
    and exists (
      select 1
      from public.children c
      where c.id = target_child_id
        and c.family_id = public.jwt_claim_uuid('family_id')
    );
$$;

-- child_session read access (self scope only)
create policy "child_session_can_view_own_child"
on public.children
for select
to authenticated
using (public.is_child_session_for(id));

create policy "child_session_can_view_own_records"
on public.reading_records
for select
to authenticated
using (public.is_child_session_for(child_id));

create policy "child_session_can_view_own_child_reactions"
on public.record_reactions_child
for select
to authenticated
using (public.is_child_session_for(child_id));

create policy "child_session_can_view_own_feeling_tags"
on public.record_feeling_tags
for select
to authenticated
using (public.is_child_session_for(child_id));

create policy "child_session_can_view_own_badges"
on public.child_badges
for select
to authenticated
using (public.is_child_session_for(child_id));

create policy "child_session_can_view_own_message_views"
on public.child_message_views
for select
to authenticated
using (public.is_child_session_for(child_id));

create policy "child_session_can_view_own_record_comments"
on public.record_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.reading_records rr
    where rr.id = record_comments.record_id
      and public.is_child_session_for(rr.child_id)
  )
);

create policy "child_session_can_view_own_record_reactions"
on public.record_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.reading_records rr
    where rr.id = record_reactions.record_id
      and public.is_child_session_for(rr.child_id)
  )
);
