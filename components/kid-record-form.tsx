'use client';

import { useActionState } from 'react';
import { createKidRecord, type KidRecordActionResult } from '@/app/actions/kid-record';
import { CHILD_FEELINGS } from '@/lib/kids/feelings';

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

  return (
    <form action={formAction} className="space-y-4 rounded-xl bg-white p-4 shadow">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">本のタイトル</label>
        <input id="title" name="title" required className="w-full rounded border p-2" />
      </div>

      <div>
        <label htmlFor="author" className="mb-1 block text-sm font-medium">著者（任意）</label>
        <input id="author" name="author" className="w-full rounded border p-2" />
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
  );
}
