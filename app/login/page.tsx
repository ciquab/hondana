'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const onSignIn = async () => {
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  const onSignUp = async () => {
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('サインアップしました。ログインしてください。');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <div className="w-full rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">ほんだな ログイン</h1>

        <div className="space-y-3">
          <input
            className="w-full rounded border p-2"
            placeholder="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded border p-2"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onSignIn}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            ログイン
          </button>
          <button
            onClick={onSignUp}
            className="rounded bg-slate-700 px-4 py-2 text-white"
          >
            サインアップ
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
      </div>
    </main>
  );
}
