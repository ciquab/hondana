'use client';

import { trackNavigationEvent, type NavigationEventName } from '@/lib/analytics/navigation-events';

type Props = {
  eventName: NavigationEventName;
  className?: string;
  childId?: string;
  target?: string;
  meta?: Record<string, string | number | boolean | null>;
  children: React.ReactNode;
};

export function TrackedSubmitButton({
  eventName,
  className,
  childId,
  target,
  meta,
  children
}: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={() => trackNavigationEvent({ event: eventName, childId, target, meta })}
    >
      {children}
    </button>
  );
}
