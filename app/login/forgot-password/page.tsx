'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onSubmit = async () => {
    setMessage('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login/reset-password`
      });

      if (error) {
        setMessage(
          '再設定メールの送信に失敗しました。メールアドレスをご確認ください。'
        );
        return;
      }

      setMessage(
        '再設定メールを送信しました。届かない場合は迷惑メールフォルダも確認し、少し待ってから再送してください。'
      );
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
        <h1 className="mb-2 text-2xl font-bold">パスワード再設定</h1>
        <p className="mb-4 text-sm text-slate-700">
          登録したメールアドレスに、パスワード再設定用のリンクを送信します。
        </p>

        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          className="w-full rounded border p-2"
          placeholder="email@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={onSubmit}
          disabled={loading || email.trim().length === 0}
          aria-busy={loading}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? '送信中…' : '再設定メールを送る'}
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
