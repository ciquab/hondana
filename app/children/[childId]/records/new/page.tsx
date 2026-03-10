'use client';

import { useActionState, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createRecord, type ActionResult } from '@/app/actions/record';
import { READING_STATUSES, STATUS_LABELS } from '@/lib/validations/record';
import { CHILD_GENRES, genreDisplayName } from '@/lib/kids/feelings';
import type { BookSearchResult } from '@/lib/books/types';
import { BookCoverImage } from '@/components/book-cover-image';

const BarcodeScanner = dynamic(() => import('@/components/barcode-scanner'), {
  ssr: false,
});

export default function NewRecordPage() {
  const { childId } = useParams<{ childId: string }>();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createRecord, {});

  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Form field state for auto-fill
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');

  const fillFromBook = useCallback((book: BookSearchResult) => {
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

      // Auto-fetch book info
      try {
        const res = await fetch(`/api/books/search?isbn=${detectedIsbn}`);
        const data = await res.json();
        if (data.results?.length > 0) {
          fillFromBook({ ...data.results[0], isbn13: detectedIsbn });
        }
      } catch {
        // ISBN set, user can fill manually
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
    <main className="mx-auto max-w-xl p-4">
      <Link href={`/children/${childId}`} className="text-sm text-blue-600 underline">
        記録一覧へ戻る
      </Link>
      <h1 className="mb-4 mt-1 text-2xl font-bold">読書記録を追加</h1>

      {/* Book registration methods */}
      <div className="mb-4 space-y-3">
        {/* Barcode scan button */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-3 text-blue-700 transition hover:bg-blue-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          バーコードで登録
        </button>

        {/* Title search */}
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
            placeholder="タイトルで本を検索…"
          />
          <button
            type="button"
            onClick={handleTitleSearch}
            disabled={searching}
            className="rounded bg-slate-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {searching ? '検索中…' : '検索'}
          </button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 ? (
          <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
            {searchResults.map((book, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => fillFromBook(book)}
                  className="flex w-full items-start gap-2 rounded p-2 text-left hover:bg-slate-50"
                >
                  <BookCoverImage
                    src={book.coverUrl}
                    alt=""
                    className="h-14 w-10 flex-shrink-0 rounded object-cover"
                    fallbackClassName="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-400"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="truncate text-xs text-slate-500">{book.author ?? '著者不明'}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          hasSearched && !searching && (
            <p className="text-sm text-slate-500">見つかりませんでした。下のフォームから手入力できます。</p>
          )
        )}
      </div>

      {/* Main form */}
      <form action={formAction} className="space-y-4 rounded-xl bg-white p-4 shadow">
        <input type="hidden" name="childId" value={childId} />
        <input type="hidden" name="coverUrl" value={coverUrl ?? ''} />

        {/* Cover preview */}
        {coverUrl && (
          <div className="flex justify-center">
            <BookCoverImage
              src={coverUrl}
              alt="表紙"
              className="h-32 rounded shadow"
              fallbackClassName="flex h-32 w-24 items-center justify-center rounded bg-slate-200 text-xs text-slate-400"
            />
          </div>
        )}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            本のタイトル <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            className="w-full rounded border p-2"
            placeholder="例: ぐりとぐら"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="author" className="mb-1 block text-sm font-medium">
            著者
          </label>
          <input
            id="author"
            name="author"
            className="w-full rounded border p-2"
            placeholder="例: 中川李枝子"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="isbn" className="mb-1 block text-sm font-medium">
            ISBN（13桁）
          </label>
          <input
            id="isbn"
            name="isbn"
            className="w-full rounded border p-2"
            placeholder="9784834000825"
            maxLength={13}
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            ステータス <span className="text-red-500">*</span>
          </label>
          <select id="status" name="status" className="w-full rounded border p-2" defaultValue="want_to_read">
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="genre" className="mb-1 block text-sm font-medium">
            ジャンル
          </label>
          <select id="genre" name="genre" className="w-full rounded border p-2" defaultValue="">
            <option value="">未分類</option>
            {CHILD_GENRES.map((g) => (
              <option key={g} value={g}>
                {genreDisplayName(g)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="memo" className="mb-1 block text-sm font-medium">
            メモ
          </label>
          <textarea
            id="memo"
            name="memo"
            className="w-full rounded border p-2"
            rows={3}
            placeholder="感想やメモを入力…"
          />
        </div>

        <div>
          <label htmlFor="finishedOn" className="mb-1 block text-sm font-medium">
            読了日
          </label>
          <input
            id="finishedOn"
            name="finishedOn"
            type="date"
            className="w-full rounded border p-2"
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? '追加中…' : '記録を追加'}
        </button>
      </form>

      {/* Barcode scanner modal */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </main>
  );
}
