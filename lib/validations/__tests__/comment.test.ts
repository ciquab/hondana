import { describe, it, expect } from 'vitest';
import { createCommentSchema } from '../comment';

describe('createCommentSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid input', () => {
    const result = createCommentSchema.safeParse({
      recordId: validUuid,
      body: 'よくよめたね！',
    });
    expect(result.success).toBe(true);
  });

  it('trims whitespace from body', () => {
    const result = createCommentSchema.safeParse({
      recordId: validUuid,
      body: '  hello  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toBe('hello');
    }
  });

  it('rejects empty body', () => {
    const result = createCommentSchema.safeParse({
      recordId: validUuid,
      body: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only body', () => {
    const result = createCommentSchema.safeParse({
      recordId: validUuid,
      body: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body over 500 chars', () => {
    const result = createCommentSchema.safeParse({
      recordId: validUuid,
      body: 'あ'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts body exactly 500 chars', () => {
    const result = createCommentSchema.safeParse({
      recordId: validUuid,
      body: 'あ'.repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for recordId', () => {
    const result = createCommentSchema.safeParse({
      recordId: 'not-a-uuid',
      body: 'test',
    });
    expect(result.success).toBe(false);
  });
});
