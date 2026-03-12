-- Add a short, human-friendly login_id to children so kids can log in
-- without needing the parent-provided URL.
-- Format: 6 uppercase alphanumeric chars (excluding confusable 0/O/1/I/L).

-- Helper to generate a random login_id
create or replace function public.generate_child_login_id()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Add column (nullable first so we can backfill)
alter table public.children
  add column if not exists login_id text;

-- Backfill existing rows with unique login_ids
do $$
declare
  child_row record;
  new_id text;
  collision boolean;
begin
  for child_row in
    select id from public.children where login_id is null
  loop
    collision := true;
    while collision loop
      new_id := public.generate_child_login_id();
      collision := exists (
        select 1 from public.children where login_id = new_id
      );
    end loop;

    update public.children set login_id = new_id where id = child_row.id;
  end loop;
end;
$$;

-- Now make it not null and unique
alter table public.children
  alter column login_id set not null,
  alter column login_id set default public.generate_child_login_id(),
  add constraint children_login_id_unique unique (login_id);

-- RPC: resolve a login_id to child UUID (used by kid login flow)
create or replace function public.resolve_child_login_id(target_login_id text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.children where login_id = upper(trim(target_login_id)) limit 1;
$$;

revoke all on function public.resolve_child_login_id(text) from public;
grant execute on function public.resolve_child_login_id(text) to service_role;
