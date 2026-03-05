-- Family invite audit log for security monitoring

create table if not exists public.family_invite_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  family_id uuid references public.families(id) on delete set null,
  invite_id uuid references public.family_invites(id) on delete set null,
  action text not null check (
    action in (
      'create_invite_failed',
      'create_invite_success',
      'revoke_invite_failed',
      'revoke_invite_success',
      'accept_invite_failed',
      'accept_invite_success'
    )
  ),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_invite_audit_logs_family_created_at
  on public.family_invite_audit_logs(family_id, created_at desc);

create index if not exists idx_family_invite_audit_logs_actor_created_at
  on public.family_invite_audit_logs(actor_user_id, created_at desc);

create index if not exists idx_family_invite_audit_logs_action_created_at
  on public.family_invite_audit_logs(action, created_at desc);

alter table public.family_invite_audit_logs enable row level security;

create policy "family members can view invite audit logs"
  on public.family_invite_audit_logs for select
  using (
    family_id is not null
    and public.is_family_member(family_id)
  );

create policy "authenticated users can insert own invite audit logs"
  on public.family_invite_audit_logs for insert
  with check (
    auth.uid() = actor_user_id
    and (family_id is null or public.is_family_member(family_id))
  );
