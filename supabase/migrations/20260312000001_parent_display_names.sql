-- Add parent display name to family_members and allow member self update

alter table public.family_members
  add column if not exists display_name text;

update public.family_members fm
set display_name = coalesce(
  nullif(u.raw_user_meta_data->>'name', ''),
  split_part(u.email, '@', 1),
  '保護者'
)
from auth.users u
where fm.user_id = u.id
  and (fm.display_name is null or btrim(fm.display_name) = '');

update public.family_members
set display_name = '保護者'
where display_name is null or btrim(display_name) = '';

alter table public.family_members
  alter column display_name set default '保護者';

alter table public.family_members
  alter column display_name set not null;

create policy "member_can_update_own_profile"
on public.family_members
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
