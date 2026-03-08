import { describe, it, expect } from 'vitest';
import { createKidRecordSchema } from '../kid-record';

describe('createKidRecordSchema', () => {
  const validBase = {
    title: 'かいけつゾロリ',
    status: 'finished' as const,
    stamp: 'great' as const,
    feelingTags: [],
  };

  it('最低限の有効データを受け入れる', () => {
    const result = createKidRecordSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('title が空のとき失敗する', () => {
    const result = createKidRecordSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
  });

  it('title が 200 文字超のとき失敗する', () => {
    const result = createKidRecordSchema.safeParse({ ...validBase, title: 'あ'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('stamp が無効な値のとき失敗する', () => {
    const result = createKidRecordSchema.safeParse({ ...validBase, stamp: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('isbn が 13 桁の数字のとき受け入れる', () => {
    const result = createKidRecordSchema.safeParse({ ...validBase, isbn: '9784061827028' });
    expect(result.success).toBe(true);
  });

  it('isbn が不正な形式のとき失敗する', () => {
    const result = createKidRecordSchema.safeParse({ ...validBase, isbn: '12345' });
    expect(result.success).toBe(false);
  });

  it('memo が 2000 文字超のとき失敗する', () => {
    const result = createKidRecordSchema.safeParse({ ...validBase, memo: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('feelingTags がデフォルトで空配列になる', () => {
    const result = createKidRecordSchema.safeParse(validBase);
    if (result.success) {
      expect(result.data.feelingTags).toEqual([]);
    }
  });

  it('有効な feelingTags を受け入れる', () => {
    const result = createKidRecordSchema.safeParse({
      ...validBase,
      feelingTags: ['ドキドキ', 'わくわく'],
    });
    expect(result.success).toBe(true);
  });

  it('無効な feelingTag を含む場合は失敗する', () => {
    const result = createKidRecordSchema.safeParse({
      ...validBase,
      feelingTags: ['ドキドキ', '無効なタグ'],
    });
    expect(result.success).toBe(false);
  });
});
