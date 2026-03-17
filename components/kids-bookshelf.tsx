'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type BookRow = {
  id: string;
  created_at: string;
  title: string | null;
  cover_url: string | null;
  genre: string | null;
  stamp: string | null;
};

const GENRE_TABS = [
  { key: 'all', label: 'すべて', emoji: '📚' },
  { key: 'story', label: 'ものがたり', emoji: '📖' },
  { key: 'zukan', label: 'ずかん', emoji: '🔬' },
  { key: 'manga', label: 'まんが', emoji: '🎭' },
  { key: 'picture_book', label: 'えほん', emoji: '🖼️' },
  { key: 'other', label: 'そのほか', emoji: '📚' }
] as const;

type GenreKey = (typeof GENRE_TABS)[number]['key'];

const GENRE_EMPTY_MESSAGES: Partial<
  Record<GenreKey, { emoji: string; main: string; sub: string }>
> = {
  story: {
    emoji: '📖',
    main: 'まだものがたりはよんでないよ',
    sub: 'どんなものがたりがあるか、おうちのひとにきいてみよう！'
  },
  zukan: {
    emoji: '🔬',
    main: 'まだずかん・かがくのほんはよんでないよ',
    sub: 'ふしぎなことをしらべてみよう！'
  },
  manga: {
    emoji: '🎭',
    main: 'まだまんがはよんでないよ',
    sub: 'すきなキャラクターをみつけてみよう！'
  },
  picture_book: {
    emoji: '🖼️',
    main: 'まだえほん・しはよんでないよ',
    sub: 'きれいなえのほんをさがしてみよう！'
  },
  other: {
    emoji: '📚',
    main: 'まだきろくがないよ',
    sub: 'いろんなほんをよんでみよう！'
  }
};

const NO_COVER_COLORS = [
  { bg: '#FDE68A', text: '#92400E' }, // amber
  { bg: '#BBF7D0', text: '#065F46' }, // emerald
  { bg: '#BFDBFE', text: '#1E3A8A' }, // blue
  { bg: '#DDD6FE', text: '#4C1D95' }, // violet
  { bg: '#FBCFE8', text: '#831843' }, // pink
  { bg: '#FED7AA', text: '#7C2D12' } // orange
];

function pickColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return NO_COVER_COLORS[hash % NO_COVER_COLORS.length];
}

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    rows.push(items.slice(i, i + size));
  return rows;
}

export function KidsBookshelf({
  records,
  childName
}: {
  records: BookRow[];
  childName: string;
}) {
  const [activeTab, setActiveTab] = useState<GenreKey>('all');

  const filtered =
    activeTab === 'all'
      ? records
      : records.filter((r) => r.genre === activeTab);

  const shelfRows = chunkRows(filtered, 4);

  const tabCounts = Object.fromEntries(
    GENRE_TABS.map(({ key }) => [
      key,
      key === 'all'
        ? records.length
        : records.filter((r) => r.genre === key).length
    ])
  ) as Record<GenreKey, number>;

  const activeTabMeta = useMemo(
    () => GENRE_TABS.find((tab) => tab.key === activeTab) ?? GENRE_TABS[0],
    [activeTab]
  );

  return (
    <section className="kid-card p-4">
      <h1 className="text-xl font-bold text-amber-800">
        {childName} のよもっと！
      </h1>

      {/* ジャンルタブ：2行3列グリッド（全タブ一覧表示・スクロール不要） */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {GENRE_TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 font-medium transition ${
              activeTab === key
                ? 'border-amber-500 bg-amber-600 text-white'
                : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:text-amber-800'
            }`}
            aria-pressed={activeTab === key}
          >
            {emoji && <span className="text-xl leading-none" aria-hidden>{emoji}</span>}
            <span className="text-xs leading-tight">{label}</span>
            <span
              className={`text-[10px] leading-none ${activeTab === key ? 'text-amber-100' : 'text-stone-400'}`}
            >
              {tabCounts[key]}
            </span>
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-stone-100 bg-stone-50 py-8 text-center">
          <span className="text-5xl" aria-hidden>
            📚
          </span>
          <p className="mt-3 text-lg font-bold text-stone-700">
            よもっと！はまだからっぽ
          </p>
          <p className="mt-1 text-sm text-stone-400">
            ほんをよんだらきろくして、よもっと！をいっぱいにしよう！
          </p>
          <Link
            href="/kids/records/new"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-600 px-5 py-2.5 text-base font-bold text-white shadow transition hover:bg-orange-700"
          >
            📖 さいしょの1さつをきろくする
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-stone-100 bg-stone-50 py-6 text-center text-sm text-stone-600">
          {GENRE_EMPTY_MESSAGES[activeTab] ? (
            <>
              <p className="text-3xl" aria-hidden>
                {GENRE_EMPTY_MESSAGES[activeTab]!.emoji}
              </p>
              <p className="mt-2 font-semibold">
                {GENRE_EMPTY_MESSAGES[activeTab]!.main}
              </p>
              <p className="mt-1 text-stone-400">
                {GENRE_EMPTY_MESSAGES[activeTab]!.sub}
              </p>
            </>
          ) : (
            <p>このジャンルのきろくはまだありません。</p>
          )}
          <Link
            href="/kids/records/new"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-orange-700"
          >
            📖 きろくをつける
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-sm font-medium text-stone-500">
              {activeTabMeta.emoji && (
                <span aria-hidden>{activeTabMeta.emoji} </span>
              )}
              {activeTabMeta.label}
            </p>
            <p className="text-xs text-stone-400">
              {activeTab === 'all'
                ? `${records.length}さつ`
                : `${filtered.length}さつ`}
            </p>
          </div>
          <div className="mt-3 space-y-4">
            {shelfRows.map((row, rowIndex) => (
              <div
                key={`${activeTab}-${rowIndex}`}
                className="bookshelf-row relative rounded-lg border border-stone-200 bg-stone-50 px-3 pb-4 pt-3"
                style={{
                  animationDelay: `${rowIndex * 80}ms`
                }}
              >
                <div className="flex min-h-48 items-end gap-3 overflow-x-auto pb-1">
                  {row.map((record) => {
                    const title = record.title ?? 'ふめいなほん';
                    const cover = record.cover_url ?? null;
                    return (
                      <Link
                        key={record.id}
                        href={`/kids/records/${record.id}`}
                        title={title}
                        className="relative w-20 flex-shrink-0 rounded-md p-1 transition hover:-translate-y-1"
                      >
                        {record.stamp && (
                          <span className="absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs shadow">
                            {record.stamp === 'great'
                              ? '🌟'
                              : record.stamp === 'fun'
                                ? '😊'
                                : record.stamp === 'ok'
                                  ? '😐'
                                  : '😓'}
                          </span>
                        )}
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt={title}
                            className="h-32 w-full rounded object-cover shadow-md"
                          />
                        ) : (
                          (() => {
                            const { bg, text } = pickColor(record.id);
                            return (
                              <div
                                className="flex h-32 w-full items-center justify-center overflow-hidden rounded shadow-md"
                                style={{ backgroundColor: bg }}
                              >
                                <span
                                  className="text-xs font-medium leading-tight"
                                  style={{
                                    writingMode: 'vertical-rl',
                                    color: text,
                                    maxHeight: '7.5rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {title.length > 20
                                    ? `${title.slice(0, 20)}…`
                                    : title}
                                </span>
                              </div>
                            );
                          })()
                        )}
                        <div className="pointer-events-none absolute -bottom-3 left-1 right-1 rounded-md bg-white/95 px-1 py-1 shadow-sm">
                          <p className="line-clamp-2 h-8 text-center text-xs leading-4 text-stone-700">
                            {title}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {/* 棚板 */}
                <div className="absolute bottom-0 left-2 right-2 h-2 rounded bg-amber-700/60" />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
