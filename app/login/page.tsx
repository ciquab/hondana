'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    setMessage('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage('メールアドレスまたはパスワードが正しくありません。');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    setMessage('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage('サインアップに失敗しました。入力内容をご確認ください。');
        return;
      }
      setMessage('サインアップしました。ログインしてください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <div className="w-full rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">ほんだな ログイン</h1>

        <div className="space-y-3">
          <div>
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
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              className="w-full rounded border p-2"
              placeholder="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onSignIn}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? '処理中…' : 'ログイン'}
          </button>
          <button
            onClick={onSignUp}
            disabled={loading}
            className="rounded bg-slate-700 px-4 py-2 text-white disabled:opacity-50"
          >
            サインアップ
          </button>
        </div>

        {message && (
          <p className="mt-4 text-sm text-slate-700" role="alert">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
