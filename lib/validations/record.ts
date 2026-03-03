import { z } from 'zod';

export const READING_STATUSES = ['want_to_read', 'reading', 'finished'] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: '読みたい',
  reading: '読書中',
  finished: '読了'
};

export const createRecordSchema = z.object({
  childId: z.string().uuid('子どもの指定が不正です'),
  title: z.string().trim().min(1, '本のタイトルを入力してください').max(200, 'タイトルは200文字以内です'),
  author: z.string().trim().max(200, '著者名は200文字以内です').optional().or(z.literal('')),
  isbn: z
    .string()
    .regex(/^\d{13}$/, 'ISBNは13桁の数字です')
    .optional()
    .or(z.literal('')),
  status: z.enum(READING_STATUSES, { message: 'ステータスを選択してください' }),
  memo: z.string().max(2000, 'メモは2000文字以内です').optional().or(z.literal('')),
  finishedOn: z.string().date('日付の形式が正しくありません').optional().or(z.literal(''))
});

export const updateRecordSchema = z.object({
  recordId: z.string().uuid('記録の指定が不正です'),
  status: z.enum(READING_STATUSES, { message: 'ステータスを選択してください' }),
  memo: z.string().max(2000, 'メモは2000文字以内です').optional().or(z.literal('')),
  finishedOn: z.string().date('日付の形式が正しくありません').optional().or(z.literal(''))
});
