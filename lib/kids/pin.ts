import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, stored] = storedHash.split(':');
  if (!salt || !stored) return false;

  const derived = scryptSync(pin, salt, KEYLEN);
  const storedBuf = Buffer.from(stored, 'hex');

  if (storedBuf.length !== derived.length) return false;
  return timingSafeEqual(storedBuf, derived);
}

export function burnPinVerifyCost(pin: string): void {
  // Mitigate timing gaps on auth failure paths (child not found / pin not set).
  // Use a fixed synthetic hash format so scrypt cost is always paid.
  verifyPin(pin, '00000000000000000000000000000000:' + '00'.repeat(KEYLEN));
}
