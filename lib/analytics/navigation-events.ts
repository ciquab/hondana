export type NavigationEventName =
  | 'dashboard_action_click'
  | 'dashboard_child_quick_add_click'
  | 'kid_home_notice_click'
  | 'kid_home_nav_click'
  | 'record_create_start'
  | 'record_create_submit'
  | 'kid_message_mark_read';

type EventPayload = {
  event: NavigationEventName;
  at: string;
  path?: string;
  childId?: string;
  target?: string;
  meta?: Record<string, string | number | boolean | null>;
};

export function trackNavigationEvent(input: Omit<EventPayload, 'at' | 'path'>) {
  if (typeof window === 'undefined') return;

  const payload: EventPayload = {
    ...input,
    at: new Date().toISOString(),
    path: window.location.pathname
  };

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json'
      });
      navigator.sendBeacon('/api/analytics/events', blob);
      return;
    }

    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      // noop
    });
  } catch {
    // noop
  }
}
