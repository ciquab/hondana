-- Audit log maintenance helpers

create or replace function public.purge_kid_auth_audit_logs(retention_days int default 180)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be >= 1';
  end if;

  delete from public.kid_auth_audit_logs
  where created_at < now() - make_interval(days => retention_days);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.purge_family_invite_audit_logs(retention_days int default 180)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be >= 1';
  end if;

  delete from public.family_invite_audit_logs
  where created_at < now() - make_interval(days => retention_days);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Restrict execution to privileged roles only
revoke all on function public.purge_kid_auth_audit_logs(int) from public;
revoke all on function public.purge_family_invite_audit_logs(int) from public;

grant execute on function public.purge_kid_auth_audit_logs(int) to service_role;
grant execute on function public.purge_family_invite_audit_logs(int) to service_role;
