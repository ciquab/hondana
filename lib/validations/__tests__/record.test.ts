import { describe, it, expect } from 'vitest';
import { createRecordSchema, updateRecordSchema } from '../record';

describe('createRecordSchema', () => {
  const validBase = {
    childId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'はらぺこあおむし',
    status: 'finished' as const,
  };

  it('最低限の有効データを受け入れる', () => {
    const result = createRecordSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('title が空のとき失敗する', () => {
    const result = createRecordSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
  });

  it('title が 200 文字超のとき失敗する', () => {
    const result = createRecordSchema.safeParse({ ...validBase, title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('childId が無効な UUID のとき失敗する', () => {
    const result = createRecordSchema.safeParse({ ...validBase, childId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('status が無効な値のとき失敗する', () => {
    const result = createRecordSchema.safeParse({ ...validBase, status: 'unknown' });
    expect(result.success).toBe(false);
  });

  it('isbn が 13 桁の数字のとき受け入れる', () => {
    const result = createRecordSchema.safeParse({ ...validBase, isbn: '9784003010013' });
    expect(result.success).toBe(true);
  });

  it('isbn が 13 桁未満のとき失敗する', () => {
    const result = createRecordSchema.safeParse({ ...validBase, isbn: '978400' });
    expect(result.success).toBe(false);
  });

  it('isbn が空文字のとき受け入れる（省略扱い）', () => {
    const result = createRecordSchema.safeParse({ ...validBase, isbn: '' });
    expect(result.success).toBe(true);
  });

  it('finishedOn が有効な日付形式のとき受け入れる', () => {
    const result = createRecordSchema.safeParse({ ...validBase, finishedOn: '2024-03-01' });
    expect(result.success).toBe(true);
  });

  it('finishedOn が無効な形式のとき失敗する', () => {
    const result = createRecordSchema.safeParse({ ...validBase, finishedOn: '2024/03/01' });
    expect(result.success).toBe(false);
  });
});

describe('updateRecordSchema', () => {
  const validBase = {
    recordId: '550e8400-e29b-41d4-a716-446655440000',
    status: 'reading' as const,
  };

  it('最低限の有効データを受け入れる', () => {
    const result = updateRecordSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('recordId が無効な UUID のとき失敗する', () => {
    const result = updateRecordSchema.safeParse({ ...validBase, recordId: 'bad' });
    expect(result.success).toBe(false);
  });

  it('memo が 2000 文字超のとき失敗する', () => {
    const result = updateRecordSchema.safeParse({ ...validBase, memo: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });
});
