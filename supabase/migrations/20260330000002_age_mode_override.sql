alter table public.children
  add column if not exists age_mode_override text not null default 'auto'
  check (age_mode_override in ('auto', 'junior', 'standard'));

comment on column public.children.age_mode_override is
  '年齢適応UIモードの親オーバーライド。auto=生年から自動判定, junior=低学年固定, standard=標準固定';
