-- Harden child_session role inheritance.
--
-- `grant authenticated to child_session` can unintentionally include policies
-- that target `authenticated`, expanding child_session capabilities beyond
-- child-only RLS intent. child_session already has explicit grants, so remove
-- inherited membership.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'child_session')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke authenticated from child_session;
  end if;
end
$$;
