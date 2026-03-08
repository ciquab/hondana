import { z } from 'zod';
import { CHILD_STAMPS, CHILD_GENRES, CHILD_FEELINGS } from '@/lib/kids/feelings';

const KID_RECORD_STATUSES = ['want_to_read', 'reading', 'finished'] as const;

export const createKidRecordSchema = z.object({
  title: z.string().trim().min(1, '本のタイトルを入力してください').max(200, 'タイトルは200文字以内です'),
  author: z.string().trim().max(200, '著者名は200文字以内です').optional().or(z.literal('')),
  isbn: z
    .string()
    .regex(/^\d{13}$/, 'ISBNは13桁の数字で入力してください')
    .optional()
    .or(z.literal('')),
  coverUrl: z.string().max(2000, 'カバー画像URLが長すぎます').optional().or(z.literal('')),
  status: z.enum(KID_RECORD_STATUSES, { message: '記録ステータスが不正です' }),
  stamp: z.enum(CHILD_STAMPS, { message: 'スタンプを選択してください' }),
  memo: z.string().max(2000, 'メモは2000文字以内です').optional().or(z.literal('')),
  finishedOn: z
    .string()
    .date('読んだ日の形式が正しくありません')
    .optional()
    .or(z.literal('')),
  genre: z.enum(CHILD_GENRES).optional().or(z.literal('')),
  feelingTags: z.array(z.enum(CHILD_FEELINGS)).default([]),
});

export type CreateKidRecordInput = z.infer<typeof createKidRecordSchema>;
