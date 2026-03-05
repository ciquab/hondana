-- Audit log maintenance runner + execution history

create table if not exists public.audit_log_maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  retention_days int not null,
  kid_auth_deleted int not null,
  family_invite_deleted int not null,
  executed_at timestamptz not null default now()
);

create index if not exists idx_audit_log_maintenance_runs_executed_at
  on public.audit_log_maintenance_runs(executed_at desc);

alter table public.audit_log_maintenance_runs enable row level security;

create policy "service role can insert maintenance runs"
  on public.audit_log_maintenance_runs for insert
  with check (coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) = 'service_role');

create policy "service role can view maintenance runs"
  on public.audit_log_maintenance_runs for select
  using (coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) = 'service_role');

create or replace function public.run_audit_log_maintenance(retention_days int default 180)
returns table (
  kid_auth_deleted int,
  family_invite_deleted int,
  executed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  kid_count int;
  invite_count int;
  now_ts timestamptz;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be >= 1';
  end if;

  kid_count := public.purge_kid_auth_audit_logs(retention_days);
  invite_count := public.purge_family_invite_audit_logs(retention_days);
  now_ts := now();

  insert into public.audit_log_maintenance_runs (
    retention_days,
    kid_auth_deleted,
    family_invite_deleted,
    executed_at
  )
  values (
    retention_days,
    kid_count,
    invite_count,
    now_ts
  );

  return query
  select kid_count, invite_count, now_ts;
end;
$$;

revoke all on function public.run_audit_log_maintenance(int) from public;
grant execute on function public.run_audit_log_maintenance(int) to service_role;
