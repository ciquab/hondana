type Props = {
  title: string;
  icon: string;
  targetValue: number;
  currentProgress: number;
  status: string;
  endsAt: string;
};

export function MissionProgress({
  title,
  icon,
  targetValue,
  currentProgress,
  status,
  endsAt,
}: Props) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000)
  );
  const pct = Math.min(100, Math.round((currentProgress / targetValue) * 100));
  const completed = status === 'completed';

  return (
    <section
      className={`mb-6 rounded-xl border p-4 ${
        completed
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-orange-200 bg-orange-50'
      }`}
    >
      <p className="mb-1 text-xs font-semibold text-slate-500">
        🎯 いまのミッション
      </p>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="font-bold text-slate-800">{title}</span>
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {completed
              ? '🎉 クリア！'
              : `あと ${targetValue - currentProgress}${title.includes('にち') ? 'にち' : 'さつ'}！`}
          </span>
          <span className="text-slate-500">
            {completed ? 'すごい！ よくがんばったね！' : `のこり ${daysLeft}にち`}
          </span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-full rounded-full transition-all ${
              completed ? 'bg-emerald-500' : 'bg-orange-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
