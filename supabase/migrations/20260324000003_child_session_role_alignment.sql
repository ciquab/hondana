-- Align child_session policies with a dedicated DB role and grants

-- Supabase maps JWT "role" claim to a Postgres role. Ensure child_session role exists.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'child_session') then
    create role child_session nologin;
  end if;
end
$$;

grant usage on schema public to child_session;

-- helper functions used by policies
grant execute on function public.jwt_claim_uuid(text) to child_session;
grant execute on function public.is_child_session_for(uuid) to child_session;

-- table privileges required in addition to RLS
grant select on table public.children to child_session;
grant select on table public.reading_records to child_session;
grant select, insert, update, delete on table public.record_reactions_child to child_session;
grant select, insert, delete on table public.record_feeling_tags to child_session;
grant select on table public.child_badges to child_session;
grant select, insert, update on table public.child_message_views to child_session;
grant select on table public.record_comments to child_session;
grant select on table public.record_reactions to child_session;

-- Retarget Phase D read policies from authenticated -> child_session

drop policy if exists "child_session_can_view_own_child" on public.children;
create policy "child_session_can_view_own_child"
on public.children
for select
to child_session
using (public.is_child_session_for(id));

drop policy if exists "child_session_can_view_own_records" on public.reading_records;
create policy "child_session_can_view_own_records"
on public.reading_records
for select
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_view_own_child_reactions" on public.record_reactions_child;
create policy "child_session_can_view_own_child_reactions"
on public.record_reactions_child
for select
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_view_own_feeling_tags" on public.record_feeling_tags;
create policy "child_session_can_view_own_feeling_tags"
on public.record_feeling_tags
for select
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_view_own_badges" on public.child_badges;
create policy "child_session_can_view_own_badges"
on public.child_badges
for select
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_view_own_message_views" on public.child_message_views;
create policy "child_session_can_view_own_message_views"
on public.child_message_views
for select
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_view_own_record_comments" on public.record_comments;
create policy "child_session_can_view_own_record_comments"
on public.record_comments
for select
to child_session
using (
  exists (
    select 1
    from public.reading_records rr
    where rr.id = record_comments.record_id
      and public.is_child_session_for(rr.child_id)
  )
);

drop policy if exists "child_session_can_view_own_record_reactions" on public.record_reactions;
create policy "child_session_can_view_own_record_reactions"
on public.record_reactions
for select
to child_session
using (
  exists (
    select 1
    from public.reading_records rr
    where rr.id = record_reactions.record_id
      and public.is_child_session_for(rr.child_id)
  )
);

-- Retarget Phase E write policies from authenticated -> child_session

drop policy if exists "child_session_can_insert_own_reaction" on public.record_reactions_child;
create policy "child_session_can_insert_own_reaction"
on public.record_reactions_child
for insert
to child_session
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.reading_records rr
    where rr.id = record_id
      and rr.child_id = record_reactions_child.child_id
  )
);

drop policy if exists "child_session_can_update_own_reaction" on public.record_reactions_child;
create policy "child_session_can_update_own_reaction"
on public.record_reactions_child
for update
to child_session
using (public.is_child_session_for(child_id))
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.reading_records rr
    where rr.id = record_id
      and rr.child_id = record_reactions_child.child_id
  )
);

drop policy if exists "child_session_can_delete_own_reaction" on public.record_reactions_child;
create policy "child_session_can_delete_own_reaction"
on public.record_reactions_child
for delete
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_insert_own_feeling_tag" on public.record_feeling_tags;
create policy "child_session_can_insert_own_feeling_tag"
on public.record_feeling_tags
for insert
to child_session
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.reading_records rr
    where rr.id = record_id
      and rr.child_id = record_feeling_tags.child_id
  )
);

drop policy if exists "child_session_can_delete_own_feeling_tag" on public.record_feeling_tags;
create policy "child_session_can_delete_own_feeling_tag"
on public.record_feeling_tags
for delete
to child_session
using (public.is_child_session_for(child_id));

drop policy if exists "child_session_can_insert_own_message_view" on public.child_message_views;
create policy "child_session_can_insert_own_message_view"
on public.child_message_views
for insert
to child_session
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.record_comments rc
    join public.reading_records rr on rr.id = rc.record_id
    where rc.id = comment_id
      and rr.child_id = child_message_views.child_id
  )
);

drop policy if exists "child_session_can_update_own_message_view" on public.child_message_views;
create policy "child_session_can_update_own_message_view"
on public.child_message_views
for update
to child_session
using (public.is_child_session_for(child_id))
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.record_comments rc
    join public.reading_records rr on rr.id = rc.record_id
    where rc.id = comment_id
      and rr.child_id = child_message_views.child_id
  )
);
