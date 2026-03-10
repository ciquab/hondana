import Link from 'next/link';

type Props = {
  title: string;
  backHref?: string;
  backLabel?: string;
  primaryAction?: React.ReactNode;
  sticky?: boolean;
};

export function AppTopNav({
  title,
  backHref,
  backLabel = 'もどる',
  primaryAction,
  sticky = true,
}: Props) {
  return (
    <header
      className={`mb-4 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur ${sticky ? 'sticky top-2 z-20' : ''}`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg border border-slate-200 px-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        ) : (
          <div className="min-h-11 min-w-11" />
        )}

        <h1 className="truncate text-center text-base font-bold text-slate-900 sm:text-lg">
          {title}
        </h1>

        <div className="flex min-h-11 min-w-11 items-center justify-end">
          {primaryAction ?? <div className="h-11 w-11" />}
        </div>
      </div>
    </header>
  );
}
