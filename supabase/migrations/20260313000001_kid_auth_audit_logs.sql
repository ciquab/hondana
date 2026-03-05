-- Kid auth audit log for security monitoring

create table if not exists public.kid_auth_audit_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete set null,
  event_type text not null check (
    event_type in (
      'invalid_input',
      'child_not_found',
      'pin_not_set',
      'locked',
      'pin_failed',
      'pin_locked',
      'success'
    )
  ),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_kid_auth_audit_logs_child_created_at
  on public.kid_auth_audit_logs(child_id, created_at desc);

create index if not exists idx_kid_auth_audit_logs_event_created_at
  on public.kid_auth_audit_logs(event_type, created_at desc);

alter table public.kid_auth_audit_logs enable row level security;

create policy "family members can view kid auth logs"
  on public.kid_auth_audit_logs for select
  using (
    child_id is not null and exists (
      select 1
      from public.children c
      where c.id = child_id
        and public.is_family_member(c.family_id)
    )
  );
