-- Allow child_session JWT role to execute kid-facing RPCs.

grant execute on function public.get_kid_child_profile(uuid) to child_session;
grant execute on function public.get_kid_recent_records(uuid, int) to child_session;
grant execute on function public.get_kid_calendar_entries(uuid, timestamptz, timestamptz) to child_session;

grant execute on function public.get_kid_messages(uuid, int) to child_session;
grant execute on function public.get_kid_record_detail(uuid, uuid) to child_session;
grant execute on function public.get_kid_record_comments(uuid, uuid, int) to child_session;
grant execute on function public.get_kid_record_reactions(uuid, uuid) to child_session;
grant execute on function public.mark_kid_message_read(uuid, uuid) to child_session;

grant execute on function public.create_kid_reading_record(uuid, text, text, text, text, text, text, text[]) to child_session;
grant execute on function public.evaluate_kid_badges(uuid, uuid) to child_session;
grant execute on function public.get_kid_badges(uuid) to child_session;
