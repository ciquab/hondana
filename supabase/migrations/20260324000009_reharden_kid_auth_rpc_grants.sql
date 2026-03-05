-- Re-harden kid auth RPC grants.
--
-- get_child_auth_for_login returns pin_hash; exposing it to anon/authenticated
-- can increase offline guessing risk. Restrict kid-auth RPCs to service_role.

revoke all on function public.get_child_auth_for_login(uuid) from anon, authenticated;
revoke all on function public.register_kid_pin_attempt(uuid, boolean) from anon, authenticated;
revoke all on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) from anon, authenticated;

grant execute on function public.get_child_auth_for_login(uuid) to service_role;
grant execute on function public.register_kid_pin_attempt(uuid, boolean) to service_role;
grant execute on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) to service_role;
