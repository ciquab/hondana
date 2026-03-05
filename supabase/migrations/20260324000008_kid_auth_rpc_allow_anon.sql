-- Reduce service_role dependency in kid PIN login by allowing anon/authenticated
-- to execute dedicated kid-auth RPCs (security definer).

revoke all on function public.get_child_auth_for_login(uuid) from public;
revoke all on function public.register_kid_pin_attempt(uuid, boolean) from public;
revoke all on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) from public;

grant execute on function public.get_child_auth_for_login(uuid) to anon, authenticated, service_role;
grant execute on function public.register_kid_pin_attempt(uuid, boolean) to anon, authenticated, service_role;
grant execute on function public.log_kid_auth_audit_event(uuid, text, text, jsonb) to anon, authenticated, service_role;
