'use client';

import { useState } from 'react';

type SuggestionRow = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  cover_url: string | null;
};

type Props = {
  suggestions: SuggestionRow[];
};

const NO_COVER_COLORS = [
  { bg: '#FDE68A', text: '#92400E' },
  { bg: '#BBF7D0', text: '#065F46' },
  { bg: '#BFDBFE', text: '#1E3A8A' },
  { bg: '#DDD6FE', text: '#4C1D95' },
  { bg: '#FBCFE8', text: '#831843' },
  { bg: '#FED7AA', text: '#7C2D12' },
];

function pickColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return NO_COVER_COLORS[hash % NO_COVER_COLORS.length];
}

export function KidSuggestionsSection({ suggestions }: Props) {
  const [selected, setSelected] = useState<SuggestionRow | null>(null);

  return (
    <>
      <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
        <p className="mb-2 text-xs font-semibold text-orange-700">
          📚 おうちのひとからのおすすめ
        </p>
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {suggestions.map((s) => {
            const title = s.title ?? 'ほん';
            const { bg, text } = pickColor(s.id);
            return (
              <li key={s.id} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(s)}
                  className="text-left"
                >
                  {s.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.cover_url}
                      alt={title}
                      className="h-20 w-14 rounded object-cover shadow"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-14 items-center justify-center overflow-hidden rounded shadow"
                      style={{ backgroundColor: bg }}
                    >
                      <span
                        className="text-xs font-medium leading-tight"
                        style={{
                          writingMode: 'vertical-rl',
                          color: text,
                          maxHeight: '4.5rem',
                          overflow: 'hidden',
                        }}
                      >
                        {title.length > 14 ? `${title.slice(0, 14)}…` : title}
                      </span>
                    </div>
                  )}
                  <p className="mt-1 w-14 truncate text-center text-xs text-orange-900">
                    {title}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* モーダル */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              aria-label="とじる"
            >
              ✕
            </button>

            {selected.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.cover_url}
                alt={selected.title ?? ''}
                className="mx-auto h-40 rounded shadow"
              />
            ) : (
              <div className="mx-auto flex h-40 w-28 items-center justify-center rounded bg-orange-100 text-4xl shadow">
                📖
              </div>
            )}

            <p className="mt-4 text-lg font-bold text-slate-800">
              {selected.title ?? 'ほん'}
            </p>
            {selected.author && (
              <p className="mt-1 text-sm text-slate-500">{selected.author}</p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <a
                href={`/kids/records/new?title=${encodeURIComponent(selected.title ?? '')}&author=${encodeURIComponent(selected.author ?? '')}&isbn=${encodeURIComponent(selected.isbn13 ?? '')}`}
                className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-orange-600"
              >
                📖 このほんを よむ
              </a>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                とじる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
