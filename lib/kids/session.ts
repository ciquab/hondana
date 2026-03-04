import { cookies } from 'next/headers';

const KID_SESSION_COOKIE = 'kid_session_child_id';

export async function setKidSession(childId: string) {
  const cookieStore = await cookies();
  cookieStore.set(KID_SESSION_COOKIE, childId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

export async function clearKidSession() {
  const cookieStore = await cookies();
  cookieStore.delete(KID_SESSION_COOKIE);
}

export async function getKidSessionChildId() {
  const cookieStore = await cookies();
  return cookieStore.get(KID_SESSION_COOKIE)?.value ?? null;
}
