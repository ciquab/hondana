-- Harden kid auth RPC grants: security-definer functions should not be callable by anon/authenticated

revoke all on function public.get_child_auth_for_login(uuid) from anon, authenticated;
revoke all on function public.register_kid_pin_attempt(uuid, boolean) from anon, authenticated;
revoke all on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) from anon, authenticated;

grant execute on function public.get_child_auth_for_login(uuid) to service_role;
grant execute on function public.register_kid_pin_attempt(uuid, boolean) to service_role;
grant execute on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) to service_role;
