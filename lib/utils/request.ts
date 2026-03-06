export function sanitizeHeaderValue(value: string | null, max = 200): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\r\n\t]/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

export function getClientIpFromForwardedFor(value: string | null): string | null {
  const first = value?.split(',')[0]?.trim() ?? null;
  return sanitizeHeaderValue(first, 64);
}
