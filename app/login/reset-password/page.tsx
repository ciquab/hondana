'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onSubmit = async () => {
    setMessage('');

    if (password.length < 8) {
      setMessage('パスワードは8文字以上で入力してください。');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('確認用パスワードが一致しません。');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(
          'パスワード更新に失敗しました。再設定リンクからやり直してください。'
        );
        return;
      }

      setMessage('パスワードを更新しました。ログイン画面に移動します。');
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    } catch {
      setMessage(
        '通信エラーが発生しました。しばらくしてからもう一度お試しください。'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <div className="w-full rounded-xl bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">新しいパスワード設定</h1>
        <p className="mb-4 text-sm text-slate-700">
          メールのリンクを開いたあと、この画面で新しいパスワードを設定してください。
        </p>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              新しいパスワード
            </label>
            <input
              id="password"
              className="w-full rounded border p-2"
              placeholder="8文字以上"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium"
            >
              新しいパスワード（確認）
            </label>
            <input
              id="confirmPassword"
              className="w-full rounded border p-2"
              placeholder="もう一度入力"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={loading}
          aria-busy={loading}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? '更新中…' : 'パスワードを更新する'}
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-700" role="alert">
            {message}
          </p>
        )}

        <p className="mt-4 text-sm">
          <Link href="/login" className="text-blue-700 underline">
            ログイン画面にもどる
          </Link>
        </p>
      </div>
    </main>
  );
}
