'use client';

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-slate-700">よみこみにしっぱいしました。</p>
      <button
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        やりなおす
      </button>
    </div>
  );
}
