-- Harden family invite audit log write path
-- - remove direct insert policy for authenticated users
-- - add service-role-only logging RPC

-- direct insert from authenticated users is no longer allowed
DROP POLICY IF EXISTS "authenticated users can insert own invite audit logs"
  ON public.family_invite_audit_logs;

create or replace function public.log_family_invite_audit_event(
  target_actor_user_id uuid,
  target_family_id uuid,
  target_invite_id uuid,
  target_action text,
  target_reason text,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_invite_audit_logs (
    actor_user_id,
    family_id,
    invite_id,
    action,
    reason,
    metadata
  )
  values (
    target_actor_user_id,
    target_family_id,
    target_invite_id,
    target_action,
    target_reason,
    coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_family_invite_audit_event(uuid, uuid, uuid, text, text, jsonb) from public;
grant execute on function public.log_family_invite_audit_event(uuid, uuid, uuid, text, text, jsonb) to service_role;
