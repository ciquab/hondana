'use client';

import dynamic from 'next/dynamic';
import { useActionState, useCallback, useState } from 'react';
import {
  createKidRecord,
  type KidRecordActionResult
} from '@/app/actions/kid-record';
import {
  CHILD_FEELINGS,
  CHILD_GENRES,
  genreDisplayName
} from '@/lib/kids/feelings';
import type { BookSearchResult } from '@/lib/books/types';

const BarcodeScanner = dynamic(() => import('@/components/barcode-scanner'), {
  ssr: false
});

const STAMPS = [
  {
    value: 'great',
    emoji: '🌟',
    label: 'すごくよかった',
    selectedClass: 'border-amber-500 bg-amber-50 text-amber-700'
  },
  {
    value: 'fun',
    emoji: '😊',
    label: 'たのしかった',
    selectedClass: 'border-emerald-500 bg-emerald-50 text-emerald-700'
  },
  {
    value: 'ok',
    emoji: '😐',
    label: 'ふつう',
    selectedClass: 'border-slate-500 bg-slate-100 text-slate-700'
  },
  {
    value: 'hard',
    emoji: '😓',
    label: 'むずかしかった',
    selectedClass: 'border-violet-500 bg-violet-50 text-violet-700'
  }
] as const;

export function KidRecordForm() {
  const [state, formAction, pending] = useActionState<
    KidRecordActionResult,
    FormData
  >(createKidRecord, {});
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [stamp, setStamp] = useState<(typeof STAMPS)[number]['value'] | ''>('');
  const [genre, setGenre] = useState<(typeof CHILD_GENRES)[number] | ''>('');
  const [feelingTags, setFeelingTags] = useState<string[]>([]);
  const [finished, setFinished] = useState(true);
  const [finishedOn, setFinishedOn] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

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
      const res = await fetch(
        `/api/books/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const toggleFeeling = (tag: string) => {
    setFeelingTags((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]
    );
  };

  return (
    <>
      <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-3 text-orange-700 transition hover:bg-orange-100"
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
            {searching ? 'けんさくちゅう…' : 'けんさく'}
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
                    <img
                      src={book.coverUrl}
                      alt=""
                      className="h-14 w-10 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-600">
                      No img
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {book.author ?? 'ちょしゃふめい'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          hasSearched &&
          !searching && (
            <p className="text-sm text-slate-500">
              みつかりませんでした。したのフォームでにゅうりょくできます。
            </p>
          )
        )}
      </div>

      <form
        action={formAction}
        className="space-y-4 rounded-xl bg-white p-4 shadow"
      >
        <input type="hidden" name="coverUrl" value={coverUrl ?? ''} />
        <input
          type="hidden"
          name="status"
          value={finished ? 'finished' : 'reading'}
        />
        <input type="hidden" name="stamp" value={stamp} />
        <input type="hidden" name="genre" value={genre} />
        {feelingTags.map((tag) => (
          <input key={tag} type="hidden" name="feelingTags" value={tag} />
        ))}

        {coverUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt="ひょうし"
              className="h-32 rounded shadow"
            />
          </div>
        )}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            ほんのタイトル
          </label>
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
          <label htmlFor="author" className="mb-1 block text-sm font-medium">
            かいたひと（にゅうりょくはじゆう）
          </label>
          <input
            id="author"
            name="author"
            className="w-full rounded border p-2"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="isbn" className="mb-1 block text-sm font-medium">
            ISBN（13けた・にゅうりょくはじゆう）
          </label>
          <input
            id="isbn"
            name="isbn"
            className="w-full rounded border p-2"
            maxLength={13}
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">スタンプをえらぶ</legend>
          <div className="grid grid-cols-2 gap-2">
            {STAMPS.map((item) => {
              const selected = stamp === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setStamp(item.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-4 text-sm transition-transform ${
                    selected
                      ? `scale-105 ${item.selectedClass}`
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            ジャンルをえらぶ{' '}
            <span className="text-xs font-normal text-slate-600">
              （かかなくてもOK）
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {CHILD_GENRES.map((g) => {
              const selected = genre === g;
              return (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGenre(selected ? '' : g)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-transform active:scale-95 ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white'}`}
                >
                  {genreDisplayName(g)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            きもちタグ（ふくすうえらべる）
          </legend>
          <div className="flex flex-wrap gap-2">
            {CHILD_FEELINGS.map((tag) => {
              const selected = feelingTags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleFeeling(tag)}
                  className={`rounded-full border px-3 py-1 text-sm ${selected ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-slate-300 bg-white text-slate-700'}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            さいごまでよんだ？
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFinished(true)}
              className={`rounded-lg border px-3 py-2 text-sm ${finished ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white'}`}
            >
              📖 さいごまでよんだ！
            </button>
            <button
              type="button"
              onClick={() => setFinished(false)}
              className={`rounded-lg border px-3 py-2 text-sm ${!finished ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white'}`}
            >
              🔖 とちゅうまでよんだ
            </button>
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="finishedOn"
            className="mb-1 block text-sm font-medium"
          >
            よんだひ
          </label>
          <input
            id="finishedOn"
            name="finishedOn"
            type="date"
            className="w-full rounded border p-2"
            value={finishedOn}
            onChange={(e) => setFinishedOn(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="memo" className="mb-1 block text-sm font-medium">
            ひとことかんそう{' '}
            <span className="text-xs font-normal text-slate-600">
              （かかなくてもOK）
            </span>
          </label>
          <textarea
            id="memo"
            name="memo"
            className="w-full rounded border p-2 text-sm"
            rows={3}
            placeholder="おもしろかった！　つぎは〇〇をよみたい…など"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || !stamp}
          className="rounded-xl bg-orange-500 px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          {pending ? 'ほぞんちゅう…' : 'ほぞんする'}
        </button>
      </form>

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
