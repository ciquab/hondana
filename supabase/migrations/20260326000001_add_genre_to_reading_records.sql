-- Step 3.5 Milestone A: reading_records にジャンルカラムを追加

alter table public.reading_records
  add column genre text
    check (genre in ('story', 'zukan', 'manga', 'picture_book', 'other'));

comment on column public.reading_records.genre is
  'ジャンル: story=物語・小説, zukan=図鑑・科学, manga=マンガ, picture_book=絵本・詩, other=その他。記録者が分類する任意項目。';
