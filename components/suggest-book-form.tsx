'use client';

import { useActionState, useCallback, useState } from 'react';
import { suggestBook, type SuggestBookResult } from '@/app/actions/suggest-book';
import type { BookSearchResult } from '@/lib/books/types';

type Props = { childId: string };

export function SuggestBookForm({ childId }: Props) {
  const [state, formAction, pending] = useActionState<SuggestBookResult, FormData>(suggestBook, {});
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSelect = (book: BookSearchResult) => {
    setSelected(book);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSuccess = () => {
    setOpen(false);
    setSelected(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
      >
        📚 おすすめの本を送る
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-orange-800">📚 おすすめの本を選ぶ</p>
        <button
          onClick={() => { setOpen(false); setSelected(null); }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ✕ 閉じる
        </button>
      </div>

      {/* 検索 */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleSearch(); } }}
          className="flex-1 rounded border p-2 text-sm"
          placeholder="タイトルで検索…"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="rounded bg-orange-500 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {searching ? '検索中…' : '検索'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <ul className="mb-3 max-h-52 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
          {searchResults.map((book, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelect(book)}
                className="flex w-full items-start gap-2 rounded p-2 text-left hover:bg-slate-50"
              >
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="h-14 w-10 flex-shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-400">
                    No img
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <p className="truncate text-xs text-slate-500">{book.author ?? '著者不明'}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
          {selected.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.coverUrl} alt="" className="h-16 w-12 flex-shrink-0 rounded object-cover shadow" />
          ) : (
            <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-400">No img</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{selected.title}</p>
            <p className="text-sm text-slate-500">{selected.author ?? '著者不明'}</p>
          </div>
          <button onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="mb-2 text-sm text-emerald-600">おすすめを送りました！</p>
      )}

      <form
        action={(fd) => {
          formAction(fd);
          if (!state.error) handleSuccess();
        }}
      >
        <input type="hidden" name="childId" value={childId} />
        <input type="hidden" name="title" value={selected?.title ?? ''} />
        <input type="hidden" name="author" value={selected?.author ?? ''} />
        <input type="hidden" name="isbn" value={selected?.isbn13 ?? ''} />
        <input type="hidden" name="coverUrl" value={selected?.coverUrl ?? ''} />
        <button
          type="submit"
          disabled={pending || !selected}
          className="w-full rounded-xl bg-orange-500 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {pending ? '送信中…' : 'この本をおすすめする 📮'}
        </button>
      </form>
    </div>
  );
}
