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
      <div className="surface w-full p-6">
        <h1 className="mb-2 text-2xl font-bold">パスワード再設定</h1>
        <p className="mb-4 text-sm text-slate-700">
          登録したメールアドレスに、パスワード再設定用のリンクを送信します。
        </p>

        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="email@example.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={onSubmit}
          disabled={loading || email.trim().length === 0}
          aria-busy={loading}
          className="btn-primary mt-4 w-full disabled:opacity-50"
        >
          {loading ? '送信中…' : '再設定メールを送る'}
        </button>

        {message && (
          <p className="mt-4 text-sm text-slate-700" role="alert">
            {message}
          </p>
        )}

        <p className="mt-4 text-sm">
          <Link
            href="/login"
            className="btn-text h-auto min-h-0 px-0 py-0 text-sky-700 underline"
          >
            ログイン画面にもどる
          </Link>
        </p>
      </div>
    </main>
  );
}
