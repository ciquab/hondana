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
  { key: 'all', label: 'すべて', emoji: null },
  { key: 'story', label: 'ものがたり・しょうせつ', emoji: '📖' },
  { key: 'zukan', label: 'ずかん・かがく', emoji: '🔬' },
  { key: 'manga', label: 'まんが', emoji: '🎭' },
  { key: 'picture_book', label: 'えほん・し', emoji: '🖼️' },
  { key: 'other', label: 'そのほか', emoji: '📚' }
] as const;

type GenreKey = (typeof GENRE_TABS)[number]['key'];

const GENRE_EMPTY_MESSAGES: Partial<
  Record<GenreKey, { emoji: string; main: string; sub: string }>
> = {
  story: {
    emoji: '📖',
    main: 'まだ ものがたりは よんでないよ',
    sub: 'どんな ものがたりがあるか、おうちのひとに きいてみよう！'
  },
  zukan: {
    emoji: '🔬',
    main: 'まだ ずかん・かがくのほんは よんでないよ',
    sub: 'ふしぎなことをしらべてみよう！'
  },
  manga: {
    emoji: '🎭',
    main: 'まだ まんがは よんでないよ',
    sub: 'すきなキャラクターをみつけてみよう！'
  },
  picture_book: {
    emoji: '🖼️',
    main: 'まだ えほん・しは よんでないよ',
    sub: 'きれいなえのほんをさがしてみよう！'
  },
  other: {
    emoji: '📚',
    main: 'まだ きろくがないよ',
    sub: 'いろんな ほんを よんでみよう！'
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
    <section className="rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 p-4 shadow">
      <h1 className="text-2xl font-bold text-amber-900">
        {childName} のほんだな
      </h1>

      {/* genre tabs */}
      <div className="mt-3 rounded-2xl bg-white/70 p-2 shadow-inner">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GENRE_TABS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-2xl px-3 py-2 text-left text-xs font-bold transition sm:text-sm ${
                activeTab === key
                  ? 'bg-amber-700 text-white shadow'
                  : 'bg-white text-amber-900 hover:bg-amber-100'
              }`}
              aria-pressed={activeTab === key}
            >
              <span className="block truncate">
                {emoji ? `${emoji} ` : ''}
                {label}
              </span>
              <span
                className={`text-[11px] font-medium ${activeTab === key ? 'text-white/90' : 'text-amber-700'}`}
              >
                {tabCounts[key]}さつ
              </span>
            </button>
          ))}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl bg-white/80 py-8 text-center shadow">
          <span className="text-5xl">📚</span>
          <p className="mt-3 text-lg font-bold text-slate-700">
            ほんだなは まだ からっぽ
          </p>
          <p className="mt-1 text-sm text-slate-500">
            ほんをよんだら きろくして、ほんだなを いっぱいにしよう！
          </p>
          <Link
            href="/kids/records/new"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-5 py-2.5 text-base font-bold text-white shadow hover:bg-orange-600"
          >
            📖 さいしょの1さつを きろくする
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-xl bg-white/80 py-6 text-center text-sm text-slate-700">
          {GENRE_EMPTY_MESSAGES[activeTab] ? (
            <>
              <p className="text-3xl">
                {GENRE_EMPTY_MESSAGES[activeTab]!.emoji}
              </p>
              <p className="mt-2 font-semibold">
                {GENRE_EMPTY_MESSAGES[activeTab]!.main}
              </p>
              <p className="mt-1 text-slate-500">
                {GENRE_EMPTY_MESSAGES[activeTab]!.sub}
              </p>
            </>
          ) : (
            <p>このジャンルの きろくは まだありません。</p>
          )}
          <Link
            href="/kids/records/new"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
          >
            📖 きろくをつける
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-amber-900">
            <p className="text-sm font-bold">📚 {activeTabMeta.label} のたな</p>
            <p className="text-xs font-semibold">
              {activeTab === 'all'
                ? `ぜんぶで ${records.length} けん`
                : `${filtered.length} さつ`}
            </p>
          </div>
          <div className="mt-4 space-y-4">
            {shelfRows.map((row, rowIndex) => (
              <div
                key={`${activeTab}-${rowIndex}`}
                className="bookshelf-row relative rounded-lg px-3 pb-4 pt-3"
                style={{
                  backgroundColor: '#DEB887',
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
                          <span className="absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs shadow">
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
                        <div className="pointer-events-none absolute -bottom-3 left-1 right-1 rounded-md bg-white/95 px-1 py-1 shadow">
                          <p className="line-clamp-2 h-8 text-center text-xs leading-4 text-slate-800">
                            {title}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div
                  className="absolute bottom-0 left-2 right-2 h-2 rounded"
                  style={{ backgroundColor: '#8B4513' }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
