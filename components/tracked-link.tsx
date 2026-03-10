'use client';

import Link from 'next/link';
import { trackNavigationEvent, type NavigationEventName } from '@/lib/analytics/navigation-events';

type Props = {
  href: string;
  className?: string;
  eventName: NavigationEventName;
  childId?: string;
  target?: string;
  meta?: Record<string, string | number | boolean | null>;
  children: React.ReactNode;
};

export function TrackedLink({
  href,
  className,
  eventName,
  childId,
  target,
  meta,
  children
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackNavigationEvent({ event: eventName, childId, target, meta })}
    >
      {children}
    </Link>
  );
}
