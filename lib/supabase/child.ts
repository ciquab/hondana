import { createHmac, randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { isUuid } from '@/lib/utils/validation';
import { env } from '@/lib/env';

type KidSessionClaims = {
  childId: string;
  familyId: string;
};

export function canCreateKidClient() {
  return true; // validated at startup via lib/env
}

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signHs256(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function createChildSessionAccessToken(claims: KidSessionClaims): string {
  if (!isUuid(claims.childId) || !isUuid(claims.familyId)) {
    throw new Error('child_session claims must be valid UUID values');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'authenticated',
    exp: now + 60 * 10,
    iat: now,
    nbf: now - 5,
    iss: 'yomotto-kid-session',
    jti: randomUUID(),
    role: 'child_session',
    child_id: claims.childId,
    family_id: claims.familyId,
    sub: claims.childId
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64urlJson(header);
  const encodedPayload = base64urlJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(signingInput, env.SUPABASE_JWT_SECRET);

  return `${signingInput}.${signature}`;
}

export function createChildSessionClient(claims: KidSessionClaims) {
  const token = createChildSessionAccessToken(claims);

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
