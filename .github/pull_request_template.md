## Summary
- 

## Motivation / Background
- 

## Testing
- [ ] `npm run lint`
- [ ] `npm run build`

## DB Migration Checklist (required if `supabase/migrations/*` changed)
- [ ] I ran `bash scripts/ci/verify-migrations.sh` locally with `DATABASE_URL` set.
- [ ] New migration filenames are time-ordered under `supabase/migrations`.
- [ ] If I added `auth.*` dependencies, I documented why they are required and why alternatives are not viable.
- [ ] For RLS / grant changes, I listed affected roles (`anon` / `authenticated` / `child_session` / `service_role`).
- [ ] I avoided environment-specific functions/columns without compatibility checks (e.g. `auth.role()`, non-portable `auth.users` columns).

## Migration CI Failure Handling (Task3)
- [ ] If migration CI failed, I recorded **cause / temporary workaround / permanent fix** in this PR.
- [ ] If failure hit escalation conditions, I involved DB owner and linked the discussion.

## Notes
- 
