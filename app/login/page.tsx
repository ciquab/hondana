'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const loading = signInLoading || signUpLoading;

  const onSignIn = async () => {
    setMessage('');
    setSignInLoading(true);
    let signInSucceeded = false;

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        setMessage('メールアドレスまたはパスワードが正しくありません。');
        return;
      }

      signInSucceeded = true;
      router.push('/dashboard');
      router.refresh();
    } catch {
      setMessage(
        '通信エラーが発生しました。しばらくしてからもう一度お試しください。'
      );
    } finally {
      if (!signInSucceeded) {
        setSignInLoading(false);
      }
    }
  };

  const onSignUp = async () => {
    setMessage('');
    setSignUpLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage('サインアップに失敗しました。入力内容をご確認ください。');
        return;
      }
      setMessage('サインアップしました。ログインしてください。');
    } catch {
      setMessage(
        '通信エラーが発生しました。しばらくしてからもう一度お試しください。'
      );
    } finally {
      setSignUpLoading(false);
    }
  };

  if (signInLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
        <section className="w-full rounded-xl bg-white p-6 text-center shadow">
          <p className="text-sm text-slate-500">よもっと！ ログイン</p>
          <h1 className="mt-2 text-2xl font-bold">ログイン中…</h1>
          <p className="mt-3 text-sm text-slate-600">
            画面が切り替わるまでそのままお待ちください。
          </p>
          <div
            className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
            aria-hidden="true"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <div className="w-full rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">よもっと！ ログイン</h1>

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
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
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
            aria-busy={signInLoading}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {signInLoading ? 'ログイン中…' : 'ログイン'}
          </button>
          <button
            onClick={onSignUp}
            disabled={loading}
            aria-busy={signUpLoading}
            className="rounded bg-slate-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {signUpLoading ? '登録中…' : 'サインアップ'}
          </button>
        </div>

        <div className="mt-3">
          <Link
            href="/login/forgot-password"
            className="text-sm text-blue-700 underline"
          >
            パスワードを忘れた方
          </Link>
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
