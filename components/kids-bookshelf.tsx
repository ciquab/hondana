'use client';

import Link from 'next/link';
import { useState } from 'react';

type BookRow = {
  id: string;
  created_at: string;
  title: string | null;
  cover_url: string | null;
  genre: string | null;
};

const GENRE_TABS = [
  { key: 'all', label: 'すべて', emoji: null },
  { key: 'story', label: '物語・小説', emoji: '📖' },
  { key: 'zukan', label: '図鑑・科学', emoji: '🔬' },
  { key: 'manga', label: 'マンガ', emoji: '🎭' },
  { key: 'picture_book', label: '絵本・詩', emoji: '🖼️' },
  { key: 'other', label: 'その他', emoji: '📚' },
] as const;

type GenreKey = (typeof GENRE_TABS)[number]['key'];

const GENRE_EMPTY_MESSAGES: Partial<Record<GenreKey, { emoji: string; main: string; sub: string }>> = {
  story: { emoji: '📖', main: 'まだ物語は読んでいないよ', sub: 'どんな物語があるか、おうちの人に聞いてみよう！' },
  zukan: { emoji: '🔬', main: 'まだ図鑑・科学本は読んでいないよ', sub: 'ふしぎなことをしらべてみよう！' },
  manga: { emoji: '🎭', main: 'まだマンガは読んでいないよ', sub: 'すきなキャラクターを見つけてみよう！' },
  picture_book: { emoji: '🖼️', main: 'まだ絵本・詩は読んでいないよ', sub: 'きれいな絵の本をさがしてみよう！' },
  other: { emoji: '📚', main: 'まだ記録がないよ', sub: 'いろんな本を読んでみよう！' },
};

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export function KidsBookshelf({ records, childName }: { records: BookRow[]; childName: string }) {
  const [activeTab, setActiveTab] = useState<GenreKey>('all');

  const filtered =
    activeTab === 'all'
      ? records
      : records.filter((r) => r.genre === activeTab);

  const shelfRows = chunkRows(filtered, 4);

  const tabCounts = Object.fromEntries(
    GENRE_TABS.map(({ key }) => [
      key,
      key === 'all' ? records.length : records.filter((r) => r.genre === key).length,
    ])
  ) as Record<GenreKey, number>;

  return (
    <section className="rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 p-4 shadow">
      <h1 className="text-2xl font-bold text-amber-900">{childName} の本だな</h1>

      {/* genre tabs */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {GENRE_TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-sm font-medium transition ${
              activeTab === key
                ? 'bg-amber-700 text-white'
                : 'bg-white/70 text-amber-900 hover:bg-white'
            }`}
          >
            {emoji ? `${emoji} ` : ''}{label}({tabCounts[key]})
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white/80 p-5 text-sm text-slate-700">
          まだ読書記録がありません。まずは「きょうの記録をつける」からはじめよう！
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white/80 p-5 text-center text-sm text-slate-700">
          {GENRE_EMPTY_MESSAGES[activeTab] ? (
            <>
              <p className="text-3xl">{GENRE_EMPTY_MESSAGES[activeTab]!.emoji}</p>
              <p className="mt-2 font-semibold">{GENRE_EMPTY_MESSAGES[activeTab]!.main}</p>
              <p className="mt-1 text-slate-500">{GENRE_EMPTY_MESSAGES[activeTab]!.sub}</p>
            </>
          ) : (
            <p>このジャンルの記録はまだありません。</p>
          )}
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-amber-900">
            {activeTab === 'all' ? `これまでの読書記録 ${records.length} 件` : `${filtered.length} 冊`}
          </p>
          <div className="mt-4 space-y-4">
            {shelfRows.map((row, rowIndex) => (
              <div key={rowIndex} className="relative rounded-lg bg-amber-100/70 px-3 pb-4 pt-3">
                <div className="flex min-h-48 items-end gap-3 overflow-x-auto pb-1">
                  {row.map((record) => {
                    const title = record.title ?? 'ふめいな本';
                    const cover = record.cover_url ?? null;
                    return (
                      <Link
                        key={record.id}
                        href={`/kids/records/${record.id}`}
                        title={title}
                        className="relative w-20 flex-shrink-0 rounded-md p-1 transition hover:-translate-y-1"
                      >
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt={title} className="h-32 w-full rounded object-cover shadow-md" />
                        ) : (
                          <div className="flex h-32 w-full items-center justify-center rounded bg-indigo-100 p-1 text-center text-[11px] leading-tight text-indigo-700 shadow-md">
                            {title.length > 22 ? `${title.slice(0, 22)}…` : title}
                          </div>
                        )}
                        <div className="pointer-events-none absolute -bottom-3 left-1 right-1 rounded-md bg-white/95 px-1 py-1 shadow">
                          <p className="line-clamp-2 h-8 text-center text-[10px] leading-4 text-slate-700">{title}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="absolute bottom-0 left-2 right-2 h-2 rounded bg-amber-800/60" />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
