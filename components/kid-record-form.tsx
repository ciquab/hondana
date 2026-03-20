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

const PRIMARY_BTN = 'btn-primary w-full text-sm font-bold disabled:opacity-50';
const SECONDARY_BTN = 'btn-secondary px-3 text-sm font-semibold disabled:opacity-50';
const TERTIARY_BTN =
  'btn-secondary border-sky-300 bg-sky-50 px-3 text-sm font-semibold text-sky-700 hover:bg-sky-100';

type KidRecordFormProps = {
  initialTitle?: string;
  initialAuthor?: string;
  initialIsbn?: string;
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
  initialFeelingTags
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
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

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
  const [memo, setMemo] = useState(initialMemo ?? '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const ageMode = useAgeMode();
  const recordCreateTrackedRef = useRef(false);
  const recordCreateStartedAtRef = useRef<number | null>(null);

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
        // noop
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
    if (isEditMode || recordCreateTrackedRef.current) return;
    recordCreateTrackedRef.current = true;
    recordCreateStartedAtRef.current = Date.now();
    trackNavigationEvent({
      event: 'record_create_start',
      target: 'kid_record_form',
      meta: { age_mode: ageMode }
    });
  }, [ageMode, isEditMode]);

  const moveToStep = (nextStep: 1 | 2 | 3) => {
    if (!isEditMode && createStep !== nextStep) {
      trackNavigationEvent({
        event: 'record_create_step',
        target: `step_${createStep}_to_${nextStep}`,
        meta: { age_mode: ageMode }
      });
    }
    setCreateStep(nextStep);
  };

  const toggleFeeling = (tag: string) => {
    setFeelingTags((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]
    );
  };

  return (
    <>
      {!isEditMode && (
        <div className="surface mb-4 space-y-3 p-4">
          <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">
            {ageMode === 'junior'
              ? '① ほんをえらぶ → ② よみおわりじょうたい → ③ きもちをきろく'
              : '① 本を選ぶ → ② 読書ステータス → ③ 気持ちを記録'}
          </div>

          {createStep === 1 && (
            <>
              <p className="text-sm font-semibold text-slate-700">1/3 本を選ぶ</p>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sky-300 bg-sky-50 p-3 text-sky-700 transition hover:bg-sky-100"
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
                  className="min-h-11 flex-1 rounded border p-2 text-sm"
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
                        className="flex min-h-11 w-full items-start gap-2 rounded p-2 text-left hover:bg-slate-50"
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
                    <p className="mb-3 text-sm text-slate-600">みつかりませんでした</p>
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

              <div>
                <label htmlFor="title" className="mb-1 block text-sm font-medium">
                  ほんのタイトル
                </label>
                <input
                  ref={titleInputRef}
                  id="title"
                  type="text"
                  required
                  className="min-h-11 w-full rounded border p-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => moveToStep(2)}
                disabled={!title.trim()}
                className={`${PRIMARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'min-h-11'}`}
              >
                {ageMode === 'junior' ? 'つぎへ' : 'つぎへ進む'}
              </button>
            </>
          )}

          {createStep === 2 && (
            <>
              <p className="text-sm font-semibold text-slate-700">2/3 読書ステータス</p>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">さいごまでよんだ？</legend>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReadStatus('finished')}
                    className={`flex min-h-11 flex-col items-center gap-1 rounded-lg border py-3 text-xs ${readStatus === 'finished' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white'}`}
                  >
                    <span className="text-xl">📖</span>
                    <span>さいごまで</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadStatus('reading')}
                    className={`flex min-h-11 flex-col items-center gap-1 rounded-lg border py-3 text-xs ${readStatus === 'reading' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white'}`}
                  >
                    <span className="text-xl">🔖</span>
                    <span>とちゅうまで</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadStatus('read_aloud')}
                    className={`flex min-h-11 flex-col items-center gap-1 rounded-lg border py-3 text-xs ${readStatus === 'read_aloud' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white'}`}
                  >
                    <span className="text-xl">👂</span>
                    <span>よんでもらった</span>
                  </button>
                </div>
              </fieldset>

              <div>
                <label htmlFor="finishedOn" className="mb-1 block text-sm font-medium">
                  よんだひ
                </label>
                <input
                  id="finishedOn"
                  type="date"
                  className="min-h-11 w-full rounded border p-2"
                  value={finishedOn}
                  onChange={(e) => setFinishedOn(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveToStep(1)}
                  className="btn-secondary flex-1"
                >
                  もどる
                </button>
                <button
                  type="button"
                  onClick={() => moveToStep(3)}
                  className="btn-primary flex-1"
                >
                  つぎへ
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isEditMode && title && (
        <div className="surface mb-4 flex items-center gap-3 p-4">
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
            <p className="line-clamp-2 font-semibold text-stone-800">{title}</p>
          </div>
        </div>
      )}

      <form
        action={formAction}
        className="surface space-y-4 p-4"
        onSubmit={(e) => {
          if (!isEditMode && createStep !== 3) {
            e.preventDefault();
          }
        }}
      >
        {isEditMode && <input type="hidden" name="recordId" value={recordId} />}
        <input type="hidden" name="coverUrl" value={coverUrl ?? ''} />
        <input type="hidden" name="stamp" value={stamp} />
        <input type="hidden" name="status" value={readStatus} />
        <input type="hidden" name="author" value={author} />
        <input type="hidden" name="isbn" value={isbn} />
        <input type="hidden" name="genre" value={genre} />
        <input type="hidden" name="finishedOn" value={finishedOn} />
        {feelingTags.map((tag) => (
          <input key={tag} type="hidden" name="feelingTags" value={tag} />
        ))}

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

        <input type="hidden" name="title" value={title} />

        {(isEditMode || createStep === 3) && (
          <>
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
                      className={`flex min-h-11 flex-col items-center gap-1 rounded-lg border py-4 text-sm transition-transform ${
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
              <legend className="mb-2 text-sm font-medium">ジャンルをえらぶ</legend>
              <div className="grid grid-cols-2 gap-2">
                {CHILD_GENRES.map((g) => {
                  const selected = genre === g;
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGenre(selected ? '' : g)}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-transform active:scale-95 ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white'}`}
                    >
                      {genreDisplayName(g)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">きもちタグ（ふくすうえらべる）</legend>
              <div className="flex flex-wrap gap-2">
                {CHILD_FEELINGS.map((tag) => {
                  const selected = feelingTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleFeeling(tag)}
                      className={`min-h-11 rounded-full border px-3 py-1 text-sm ${selected ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-slate-300 bg-white text-slate-700'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="memo" className="mb-1 block text-sm font-medium">
                ひとことかんそう
              </label>
              <textarea
                id="memo"
                name="memo"
                className="w-full rounded border p-2 text-sm"
                rows={3}
                placeholder="おもしろかった！　つぎは〇〇をよみたい…など"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </>
        )}

        {state.error && (isEditMode || createStep === 3) && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        {!stamp && (isEditMode || createStep === 3) && (
          <p className="text-center text-sm text-amber-700">⬆️ スタンプをえらんでね！</p>
        )}

        {(isEditMode || createStep === 3) && (
          <>
            {!isEditMode && (
              <button
                type="button"
                onClick={() => moveToStep(2)}
                className="btn-secondary w-full"
              >
                もどる
              </button>
            )}

            <button
              type="submit"
              disabled={pending || !stamp}
              className={`${PRIMARY_BTN} ${ageMode === 'junior' ? 'h-14 text-base' : 'min-h-11'}`}
              onClick={() =>
                trackNavigationEvent({
                  event: 'record_create_submit',
                  target: isEditMode ? 'edit' : 'step3',
                  meta: {
                    hasStamp: Boolean(stamp),
                    hasGenre: Boolean(genre),
                    age_mode: ageMode,
                    elapsed_ms:
                      !isEditMode && recordCreateStartedAtRef.current
                        ? Date.now() - recordCreateStartedAtRef.current
                        : null
                  }
                })
              }
            >
              {pending
                ? 'ほぞんちゅう…'
                : isEditMode
                  ? ageMode === 'junior'
                    ? 'へんこうをほぞんする'
                    : '変更を保存する'
                  : ageMode === 'junior'
                    ? 'きろくをおえる'
                    : '記録を完了する'}
            </button>
          </>
        )}
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
