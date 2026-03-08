import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { isUuid } from '@/lib/utils/validation';
import { env } from '@/lib/env';

const KID_SESSION_COOKIE = 'kid_session';
const KID_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type KidSessionPayload = {
  childId: string;
  familyId: string;
  exp: number;
};

export function canUseKidSession() {
  return true; // validated at startup via lib/env
}

function sign(payloadBase64: string): string {
  return createHmac('sha256', env.KID_SESSION_SECRET).update(payloadBase64).digest('base64url');
}

function encodeSession(payload: KidSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(body);
  return `${body}.${sig}`;
}

function decodeSession(token: string): KidSessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as KidSessionPayload;
    if (!payload.childId || !payload.familyId || !payload.exp) return null;
    if (!isUuid(payload.childId) || !isUuid(payload.familyId)) return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setKidSession(payload: { childId: string; familyId: string }) {
  const cookieStore = await cookies();
  const exp = Math.floor(Date.now() / 1000) + KID_SESSION_MAX_AGE_SECONDS;
  const token = encodeSession({ childId: payload.childId, familyId: payload.familyId, exp });

  cookieStore.set(KID_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: KID_SESSION_MAX_AGE_SECONDS
  });
}

export async function clearKidSession() {
  const cookieStore = await cookies();
  cookieStore.delete(KID_SESSION_COOKIE);
}

export async function getKidSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(KID_SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload) {
    cookieStore.delete(KID_SESSION_COOKIE);
    return null;
  }

  return payload;
}

export async function getKidSessionChildId() {
  const payload = await getKidSession();
  return payload?.childId ?? null;
}
