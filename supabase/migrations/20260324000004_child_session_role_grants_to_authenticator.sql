-- Ensure PostgREST can assume custom JWT role `child_session`
-- by allowing `authenticator` to SET ROLE child_session.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'child_session')
     and exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant child_session to authenticator;
  end if;
end
$$;

-- Also ensure child_session can inherit baseline authenticated permissions
-- expected by Supabase policies and helper functions.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'child_session')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant authenticated to child_session;
  end if;
end
$$;
