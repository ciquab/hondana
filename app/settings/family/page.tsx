import Link from 'next/link';
import { createFamily } from '@/app/actions/family';
import { getFamiliesForCurrentUser } from '@/lib/db/family';

export default async function FamilySettingsPage() {
  const families = await getFamiliesForCurrentUser();

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-4 text-2xl font-bold">家族設定</h1>
      <Link className="mb-4 inline-block text-blue-600 underline" href="/dashboard">
        ダッシュボードへ戻る
      </Link>

      {families.length > 0 ? (
        <div className="mb-6 rounded bg-green-50 p-4 text-green-800">
          家族は作成済みです。必要であれば別家族を追加できます。
        </div>
      ) : (
        <div className="mb-6 rounded bg-amber-50 p-4 text-amber-800">
          まだ家族がありません。最初の家族を作成してください。
        </div>
      )}

      <form action={createFamily} className="rounded-xl bg-white p-4 shadow">
        <label className="mb-2 block text-sm">家族名</label>
        <input
          name="name"
          className="mb-3 w-full rounded border p-2"
          placeholder="例: 田中ファミリー"
          required
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
          家族を作成
        </button>
      </form>
    </main>
  );
}
