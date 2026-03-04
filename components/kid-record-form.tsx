'use client';

import dynamic from 'next/dynamic';
import { useActionState, useCallback, useState } from 'react';
import { createKidRecord, type KidRecordActionResult } from '@/app/actions/kid-record';
import { CHILD_FEELINGS } from '@/lib/kids/feelings';
import type { GoogleBookResult } from '@/lib/books/google-books';

const BarcodeScanner = dynamic(() => import('@/components/barcode-scanner'), {
  ssr: false
});

const STAMPS = [
  { value: 'great', label: '🌟 すごくよかった' },
  { value: 'fun', label: '😊 たのしかった' },
  { value: 'ok', label: '😐 ふつう' },
  { value: 'hard', label: '😓 むずかしかった' }
] as const;

export function KidRecordForm() {
  const [state, formAction, pending] = useActionState<KidRecordActionResult, FormData>(
    createKidRecord,
    {}
  );
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GoogleBookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const fillFromBook = useCallback((book: GoogleBookResult) => {
    setTitle(book.title);
    setAuthor(book.author ?? '');
    setIsbn(book.isbn13 ?? '');
    setCoverUrl(book.coverUrl);
    setSearchResults([]);
    setSearchQuery('');
    setHasSearched(false);
  }, []);

  const handleBarcodeDetected = useCallback(
    async (detectedIsbn: string) => {
      setShowScanner(false);
      setIsbn(detectedIsbn);

      try {
        const res = await fetch(`/api/books/search?isbn=${detectedIsbn}`);
        const data = await res.json();
        if (data.results?.length > 0) {
          fillFromBook({ ...data.results[0], isbn13: detectedIsbn });
        }
      } catch {
        // ISBN set only; manual input remains possible.
      }
    },
    [fillFromBook]
  );

  const handleTitleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setHasSearched(true);
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

  return (
    <>
      <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-3 text-blue-700 transition hover:bg-blue-100"
        >
          バーコードでとうろく
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleTitleSearch();
              }
            }}
            className="flex-1 rounded border p-2 text-sm"
            placeholder="しょめいでけんさく…"
          />
          <button
            type="button"
            onClick={handleTitleSearch}
            disabled={searching}
            className="rounded bg-slate-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {searching ? 'けんさく中…' : 'けんさく'}
          </button>
        </div>

        {searchResults.length > 0 ? (
          <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
            {searchResults.map((book, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => fillFromBook(book)}
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
                    <p className="truncate text-xs text-slate-500">{book.author ?? 'ちょしゃふめい'}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          hasSearched && !searching && (
            <p className="text-sm text-slate-500">みつかりませんでした。したのフォームでにゅうりょくできます。</p>
          )
        )}
      </div>

      <form action={formAction} className="space-y-4 rounded-xl bg-white p-4 shadow">
        <input type="hidden" name="coverUrl" value={coverUrl ?? ''} />

        {coverUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="ひょうし" className="h-32 rounded shadow" />
          </div>
        )}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">本のタイトル</label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded border p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="author" className="mb-1 block text-sm font-medium">著者（任意）</label>
          <input
            id="author"
            name="author"
            className="w-full rounded border p-2"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="isbn" className="mb-1 block text-sm font-medium">ISBN（13けた・任意）</label>
          <input
            id="isbn"
            name="isbn"
            className="w-full rounded border p-2"
            maxLength={13}
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">ステータス</label>
          <select id="status" name="status" className="w-full rounded border p-2" defaultValue="finished">
            <option value="want_to_read">よみたい</option>
            <option value="reading">よんでる</option>
            <option value="finished">よみおわった</option>
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">スタンプ</legend>
          <div className="space-y-2">
            {STAMPS.map((stamp) => (
              <label key={stamp.value} className="flex items-center gap-2">
                <input type="radio" name="stamp" value={stamp.value} required />
                <span>{stamp.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">きもちタグ（複数選択）</legend>
          <div className="flex flex-wrap gap-2">
            {CHILD_FEELINGS.map((tag) => (
              <label key={tag} className="rounded border px-2 py-1 text-sm">
                <input type="checkbox" name="feelingTags" value={tag} className="mr-1" />
                {tag}
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {pending ? '保存中…' : '保存する'}
        </button>
      </form>

      {showScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}
    </>
  );
}
