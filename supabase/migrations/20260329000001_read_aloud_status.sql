-- 3.8-6: 「よんでもらった (read_aloud)」ステータス追加

-- 1. CHECK 制約の更新
alter table reading_records drop constraint reading_records_status_check;
alter table reading_records add constraint reading_records_status_check
  check (status in ('want_to_read', 'reading', 'finished', 'read_aloud'));

-- 2. 月次読書カウント RPC: read_aloud も読了扱いに
create or replace function get_monthly_read_counts_for_children(target_child_ids uuid[], month_start date)
returns table(child_id uuid, count bigint)
language sql stable security definer
as $$
  select rr.child_id, count(*) as count
  from reading_records rr
  where rr.child_id = any(target_child_ids)
    and rr.status in ('finished', 'read_aloud')
    and rr.finished_on >= month_start
  group by rr.child_id;
$$;
