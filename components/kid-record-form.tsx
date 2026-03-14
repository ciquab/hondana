'use client';

import dynamic from 'next/dynamic';
import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import {
  createKidRecord,
  updateKidRecord,
  type KidRecordActionResult
} from '@/app/actions/kid-record';
import {
  CHILD_FEELINGS,
  CHILD_GENRES,
  genreDisplayName
} from '@/lib/kids/feelings';
import type { BookSearchResult } from '@/lib/books/types';
import { BookCoverImg } from '@/components/book-cover-img';
import { trackNavigationEvent } from '@/lib/analytics/navigation-events';
import { useAgeMode } from '@/lib/kids/age-mode-context';

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

const PRIMARY_BTN =
  'w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-50';
const SECONDARY_BTN =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';
const TERTIARY_BTN =
  'rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100';

type KidRecordFormProps = {
  // 新規作成モード
  initialTitle?: string;
  initialAuthor?: string;
  initialIsbn?: string;
  // 編集モード（recordId が渡された場合）
  recordId?: string;
  initialCoverUrl?: string;
  initialStamp?: string;
  initialStatus?: 'finished' | 'reading' | 'read_aloud';
  initialMemo?: string;
  initialFinishedOn?: string;
  initialGenre?: string;
  initialFeelingTags?: string[];
};

export function KidRecordForm({
  initialTitle,
  initialAuthor,
  initialIsbn,
  recordId,
  initialCoverUrl,
  initialStamp,
  initialStatus,
  initialMemo,
  initialFinishedOn,
  initialGenre,
  initialFeelingTags,
}: KidRecordFormProps = {}) {
  const isEditMode = Boolean(recordId);
  const action = isEditMode ? updateKidRecord : createKidRecord;
  const [state, formAction, pending] = useActionState<
    KidRecordActionResult,
    FormData
  >(action, {});
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [title, setTitle] = useState(initialTitle ?? '');
  const [author, setAuthor] = useState(initialAuthor ?? '');
  const [isbn, setIsbn] = useState(initialIsbn ?? '');
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl ?? null);
  const [stamp, setStamp] = useState<(typeof STAMPS)[number]['value'] | ''>(
    (initialStamp as (typeof STAMPS)[number]['value']) ?? ''
  );
  const [genre, setGenre] = useState<(typeof CHILD_GENRES)[number] | ''>(
    (initialGenre as (typeof CHILD_GENRES)[number]) ?? ''
  );
  const [feelingTags, setFeelingTags] = useState<string[]>(initialFeelingTags ?? []);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const ageMode = useAgeMode();
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const recordCreateTrackedRef = useRef(false);

  const [readStatus, setReadStatus] = useState<'finished' | 'reading' | 'read_aloud'>(
    initialStatus ?? 'finished'
  );
  const [finishedOn, setFinishedOn] = useState(
    initialFinishedOn ?? new Date().toISOString().slice(0, 10)
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


  useEffect(() => {
    if (recordCreateTrackedRef.current) return;
    recordCreateTrackedRef.current = true;
    trackNavigationEvent({
      event: 'record_create_start',
      target: 'kid_record_form',
      meta: { age_mode: ageMode }
    });
  }, [ageMode]);

  const toggleFeeling = (tag: string) => {
    setFeelingTags((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]
    );
  };

  return (
    <>
      {/* 書籍検索エリア：新規作成モードのみ表示 */}
      {!isEditMode && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 p-3 text-orange-700 transition hover:bg-orange-100"
          >
            📷 バーコードでとうろく
          </button>

          <div className="flex gap-2">
            <input
              ref={searchInputRef}
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
              placeholder="ほんのなまえをいれよう…"
            />
            <button
              type="button"
              onClick={handleTitleSearch}
              disabled={searching}
              className={SECONDARY_BTN}
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
                  <BookCoverImg
                    src={book.coverUrl}
                    placeholderClassName="flex h-14 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs text-slate-600"
                  />
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="mb-3 text-sm text-slate-600">
                みつかりませんでした
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setHasSearched(false);
                    searchInputRef.current?.focus();
                  }}
                  className={SECONDARY_BTN}
                >
                  べつのことばでけんさくする
                </button>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className={TERTIARY_BTN}
                >
                  バーコードでさがす
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasSearched(false);
                    setSearchQuery('');
                    titleInputRef.current?.focus();
                  }}
                  className={SECONDARY_BTN}
                >
                  じぶんでにゅうりょくする
                </button>
              </div>
            </div>
          )
        )}
        </div>
      )}

      {/* 編集モード：本のタイトルを表示のみ（変更不可） */}
      {isEditMode && title && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white p-4 shadow">
          {coverUrl && (
            <BookCoverImg
              src={coverUrl}
              className="h-16 w-11 flex-shrink-0 rounded shadow-sm"
              placeholderClassName="flex h-16 w-11 flex-shrink-0 items-center justify-center rounded bg-amber-100 text-xs text-amber-700"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs text-stone-400">
              {ageMode === 'junior' ? 'このほんをへんしゅう' : 'この本を編集'}
            </p>
            <p className="font-semibold text-stone-800 line-clamp-2">{title}</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('simple')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition-colors ${
            mode === 'simple'
              ? 'bg-white text-orange-600 shadow'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ✨ かんたん
        </button>
        <button
          type="button"
          onClick={() => setMode('detailed')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition-colors ${
            mode === 'detailed'
              ? 'bg-white text-orange-600 shadow'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📝 くわしく
        </button>
      </div>

      <form
        action={formAction}
        className="space-y-4 rounded-xl bg-white p-4 shadow"
      >
        {isEditMode && <input type="hidden" name="recordId" value={recordId} />}
        <input type="hidden" name="coverUrl" value={coverUrl ?? ''} />
        <input type="hidden" name="stamp" value={stamp} />
        {mode === 'simple' ? (
          <>
            <input type="hidden" name="status" value="finished" />
            <input
              type="hidden"
              name="finishedOn"
              value={new Date().toISOString().slice(0, 10)}
            />
            <input type="hidden" name="author" value={author} />
            <input type="hidden" name="isbn" value={isbn} />
          </>
        ) : (
          <>
            <input
              type="hidden"
              name="status"
              value={readStatus}
            />
            <input type="hidden" name="genre" value={genre} />
            {feelingTags.map((tag) => (
              <input key={tag} type="hidden" name="feelingTags" value={tag} />
            ))}
          </>
        )}

        {coverUrl && (
          <div className="flex justify-center">
            <BookCoverImg
              src={coverUrl}
              alt="ひょうし"
              className="h-32 rounded shadow"
              placeholderClassName="flex h-32 w-24 items-center justify-center rounded bg-slate-200 text-xs text-slate-400 shadow"
            />
          </div>
        )}

        {isEditMode ? (
          <input type="hidden" name="title" value={title} />
        ) : (
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              ほんのタイトル
            </label>
            <input
              ref={titleInputRef}
              id="title"
              name="title"
              required
              className="w-full rounded border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        )}

        {mode === 'detailed' && (
          <>
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
          </>
        )}

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

        {mode === 'detailed' && (
          <>
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReadStatus('finished')}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs ${readStatus === 'finished' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white'}`}
                >
                  <span className="text-xl">📖</span>
                  <span>さいごまで</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReadStatus('reading')}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs ${readStatus === 'reading' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white'}`}
                >
                  <span className="text-xl">🔖</span>
                  <span>とちゅうまで</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReadStatus('read_aloud')}
                  className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs ${readStatus === 'read_aloud' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white'}`}
                >
                  <span className="text-xl">👂</span>
                  <span>よんでもらった</span>
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
          </>
        )}

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        {!stamp && (
          <p className="text-center text-sm text-amber-700">
            ⬆️{' '}
            {ageMode === 'junior'
              ? 'スタンプをえらんでね！'
              : 'スタンプを選んでから保存できます'}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !stamp}
          className={`${PRIMARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'h-10'}`}
          onClick={() =>
            trackNavigationEvent({
              event: 'record_create_submit',
              target: mode,
              meta: { hasStamp: Boolean(stamp), hasGenre: Boolean(genre), age_mode: ageMode }
            })
          }
        >
          {pending
            ? 'ほぞんちゅう…'
            : isEditMode
              ? ageMode === 'junior'
                ? 'へんこうをほぞんする'
                : '変更を保存する'
              : 'ほぞんする'}
        </button>
      </form>

      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowScanner(false)}
          ageMode={ageMode}
        />
      )}
    </>
  );
}
