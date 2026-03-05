-- Phase E (prep): child_session write-side RLS scaffold for child-owned rows

-- child stamp (1 record = 1 stamp)
create policy "child_session_can_insert_own_reaction"
on public.record_reactions_child
for insert
to authenticated
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.reading_records rr
    where rr.id = record_id
      and rr.child_id = record_reactions_child.child_id
  )
);

create policy "child_session_can_update_own_reaction"
on public.record_reactions_child
for update
to authenticated
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

create policy "child_session_can_delete_own_reaction"
on public.record_reactions_child
for delete
to authenticated
using (public.is_child_session_for(child_id));

-- feeling tags
create policy "child_session_can_insert_own_feeling_tag"
on public.record_feeling_tags
for insert
to authenticated
with check (
  public.is_child_session_for(child_id)
  and exists (
    select 1
    from public.reading_records rr
    where rr.id = record_id
      and rr.child_id = record_feeling_tags.child_id
  )
);

create policy "child_session_can_delete_own_feeling_tag"
on public.record_feeling_tags
for delete
to authenticated
using (public.is_child_session_for(child_id));

-- message read receipts
create policy "child_session_can_insert_own_message_view"
on public.child_message_views
for insert
to authenticated
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

create policy "child_session_can_update_own_message_view"
on public.child_message_views
for update
to authenticated
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
