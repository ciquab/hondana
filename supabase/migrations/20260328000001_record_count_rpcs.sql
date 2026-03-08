-- Optimized: count records per child using SQL GROUP BY instead of fetching all rows
create or replace function get_record_counts_for_children(target_child_ids uuid[])
returns table(child_id uuid, count bigint)
language sql stable security definer
as $$
  select rr.child_id, count(*) as count
  from reading_records rr
  where rr.child_id = any(target_child_ids)
  group by rr.child_id;
$$;

-- Optimized: count monthly finished records per child using SQL GROUP BY
create or replace function get_monthly_read_counts_for_children(target_child_ids uuid[], month_start date)
returns table(child_id uuid, count bigint)
language sql stable security definer
as $$
  select rr.child_id, count(*) as count
  from reading_records rr
  where rr.child_id = any(target_child_ids)
    and rr.status = 'finished'
    and rr.finished_on >= month_start
  group by rr.child_id;
$$;

-- Optimized: count records per genre for a child using SQL GROUP BY
create or replace function get_genre_breakdown_for_child(target_child_id uuid)
returns table(genre text, count bigint)
language sql stable security definer
as $$
  select rr.genre, count(*) as count
  from reading_records rr
  where rr.child_id = target_child_id
    and rr.genre is not null
  group by rr.genre;
$$;
