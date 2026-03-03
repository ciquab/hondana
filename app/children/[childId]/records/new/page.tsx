'use client';

import { useActionState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createRecord, type ActionResult } from '@/app/actions/record';
import { READING_STATUSES, STATUS_LABELS } from '@/lib/validations/record';

export default function NewRecordPage() {
  const { childId } = useParams<{ childId: string }>();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createRecord, {});

  return (
    <main className="mx-auto max-w-xl p-4">
      <Link href={`/children/${childId}`} className="text-sm text-blue-600 underline">
        記録一覧へ戻る
      </Link>
      <h1 className="mb-4 mt-1 text-2xl font-bold">読書記録を追加</h1>

      <form action={formAction} className="space-y-4 rounded-xl bg-white p-4 shadow">
        <input type="hidden" name="childId" value={childId} />

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
    </main>
  );
}
