type Props = {
  icon: string;
  title: string;
  description?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
};

export function EmptyStateCard({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white px-4 py-8 text-center shadow">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-2 font-semibold text-slate-700">{title}</p>
      {description ? (
        <div className="mt-1 text-sm text-slate-500">{description}</div>
      ) : null}
      {(primaryAction || secondaryAction) && (
        <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
