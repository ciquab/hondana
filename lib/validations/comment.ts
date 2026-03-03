import { z } from 'zod';

export const createCommentSchema = z.object({
  recordId: z.string().uuid('記録の指定が不正です'),
  body: z.string().trim().min(1, 'コメントを入力してください').max(500, '500文字以内で入力してください')
});
