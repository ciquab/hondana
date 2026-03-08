import { describe, it, expect } from 'vitest';
import { sanitizeHeaderValue, getClientIpFromForwardedFor } from '../request';

describe('sanitizeHeaderValue', () => {
  it('改行・タブを空白に変換する', () => {
    expect(sanitizeHeaderValue('value\r\ninjection')).toBe('value  injection');
    expect(sanitizeHeaderValue('value\tinjection')).toBe('value injection');
  });

  it('最大長で切り詰める', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeHeaderValue(long, 200)?.length).toBe(200);
  });

  it('null / 空文字は null を返す', () => {
    expect(sanitizeHeaderValue(null)).toBeNull();
    expect(sanitizeHeaderValue('')).toBeNull();
    expect(sanitizeHeaderValue('   ')).toBeNull();
  });

  it('通常の値はそのまま返す', () => {
    expect(sanitizeHeaderValue('Mozilla/5.0')).toBe('Mozilla/5.0');
  });
});

describe('getClientIpFromForwardedFor', () => {
  it('最初の IP を返す', () => {
    expect(getClientIpFromForwardedFor('1.2.3.4, 5.6.7.8')).toBe('1.2.3.4');
  });

  it('単一 IP を返す', () => {
    expect(getClientIpFromForwardedFor('192.168.1.1')).toBe('192.168.1.1');
  });

  it('null は null を返す', () => {
    expect(getClientIpFromForwardedFor(null)).toBeNull();
  });

  it('前後の空白を除去する', () => {
    expect(getClientIpFromForwardedFor('  10.0.0.1  , 10.0.0.2')).toBe('10.0.0.1');
  });
});
