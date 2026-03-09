import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

/**
 * Step 4 AI 機能で共通して使う Anthropic クライアント。
 * サーバーサイド（Server Actions / API Routes）専用。
 * クライアントコンポーネントから直接インポートしないこと。
 */
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});
