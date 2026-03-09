# Step 4 詳細設計提案 ― AI 機能実装

作成日: 2026-03-09
対象ブランチ: `claude/phase-plan-step4-design-EDm7P`
前提: Step 1〜3.8 完了済み

---

## 概要

Step 4 は Claude API を活用し、Step 3.8 で整えた習慣化 UX を「個別最適な提案」に進化させるフェーズ。
子どもの読書履歴・ジャンル傾向・感情タグを入力として、

1. **次に読む本の橋渡し提案**（図鑑好きの子を物語に誘う）
2. **汎用レコメンド**（読んだ本と気持ちから次の一冊を提示）
3. **やさしいあらすじ生成**（本の詳細ページ）
4. **年齢適応 UI**（6–8 歳: ひらがな中心 / 9+ 歳: 標準）
5. **2 層ジャンル設計**（入力 UI は 5 分類のまま、内部でサブジャンルを付与）

の 5 軸を実装する。

---

## 実装優先順

```
Sprint A: 4-7（年齢適応UI） ← 他機能の基盤
Sprint B: 4-8（2層ジャンル） ← AI精度の前提条件
Sprint C: 4-2（橋渡しレコメンド） ← 最重要・ペルソナA直撃
Sprint D: 4-1（やさしいあらすじ）+ 4-3（汎用レコメンド）
Sprint E: 4-6（コスト管理・品質評価）+ 4-4（カーリルAPI）
Backlog:  4-5（読書ポイント）← Step 5 以降に移動可
```

> **理由**: 年齢適応 UI (4-7) はアプリ全体の文言/レイアウトに影響するため、AI 機能の文言生成の前に実装。
> 2 層ジャンル (4-8) は AI プロンプトの精度に直結するため 4-2 の直前に実装。

---

## 4-7: 年齢適応 UI モード（Sprint A）

### ゴール

子どもプロフィールの生年 (`birth_year`) から年齢を算出し、画面全体の文言・レイアウトを自動調整する。
Step 3.7b-2 の「かんたんモード」をシステム全体に展開する。

### モード定義

| モード | 対象年齢 | 主な特徴 |
|--------|----------|----------|
| 低学年モード（`junior`） | 〜8 歳 | ひらがな優先・大ボタン・1 画面 1 目的 |
| 標準モード（`standard`） | 9 歳〜 | 漢字・通常レイアウト・情報量を増やす |

### 設計

#### 年齢算出ロジック

```typescript
// lib/kids/age-mode.ts
export type AgeMode = 'junior' | 'standard';

export function getAgeMode(birthYear: number | null): AgeMode {
  if (!birthYear) return 'standard';
  const age = new Date().getFullYear() - birthYear;
  return age <= 8 ? 'junior' : 'standard';
}
```

#### 親によるオーバーライド

- DB: `children` テーブルに `age_mode_override text CHECK (age_mode_override IN ('auto', 'junior', 'standard'))` 列を追加（デフォルト `'auto'`）
- 設定画面から変更可能

#### Context / Hook

```typescript
// lib/kids/age-mode-context.tsx
'use client';
import { createContext, useContext } from 'react';
import { AgeMode } from './age-mode';

const AgeModeContext = createContext<AgeMode>('standard');

export function AgeModeProvider({
  mode,
  children,
}: {
  mode: AgeMode;
  children: React.ReactNode;
}) {
  return (
    <AgeModeContext.Provider value={mode}>
      {children}
    </AgeModeContext.Provider>
  );
}

export function useAgeMode(): AgeMode {
  return useContext(AgeModeContext);
}
```

#### 文言ヘルパー

```typescript
// lib/kids/age-text.ts
export function t(
  key: string,
  mode: AgeMode,
  texts: { junior: string; standard: string }
): string {
  return texts[mode];
}

// 使用例
const label = t('record.stamp', mode, {
  junior: 'きもちをえらんでね',
  standard: 'スタンプを選択',
});
```

#### UI 差分（主要箇所）

| 項目 | junior | standard |
|------|--------|----------|
| ボタン高さ | `h-14` (56px) | `h-10` (40px) |
| 基本フォントサイズ | `text-base` | `text-sm` |
| 記録フォーム | かんたんモード固定 | かんたん/くわしく 切替あり |
| スタンプ選択 | 4 個のみ・大きなアイコン | 4 個・通常サイズ |
| ジャンル選択 | 3 選択肢（物語/図鑑・マンガ/その他） | 5 選択肢フル表示 |
| ナビゲーション | テキストなし・アイコンのみ | アイコン+テキスト |

#### DBマイグレーション

```sql
-- supabase/migrations/20260330000001_age_mode_override.sql
ALTER TABLE public.children
  ADD COLUMN age_mode_override text NOT NULL DEFAULT 'auto'
  CHECK (age_mode_override IN ('auto', 'junior', 'standard'));

COMMENT ON COLUMN public.children.age_mode_override IS
  '年齢適応UIモードの親オーバーライド。auto=生年から自動判定, junior=低学年固定, standard=標準固定';
```

#### 実装ファイル一覧

```
lib/kids/age-mode.ts              ← 年齢算出ロジック
lib/kids/age-mode-context.tsx     ← React Context
lib/kids/age-text.ts              ← 文言ヘルパー
app/kids/layout.tsx               ← AgeModeProvider をラップ
app/settings/children/[id]/page.tsx ← オーバーライド設定UI
supabase/migrations/..._age_mode.sql
```

---

## 4-8: 2 層ジャンル設計（Sprint B）

### ゴール

入力 UI の 5 分類（story / zukan / manga / picture_book / other）は変えずに、
内部でサブジャンル・テーマタグを自動付与し、AI レコメンドの精度を向上させる。

### サブジャンル定義

| 親ジャンル | サブジャンル候補（AI が付与） |
|-----------|----------------------------|
| story | fantasy / adventure / mystery / friendship / animal / historical / humor |
| zukan | science / nature / history / society / biography / math |
| manga | adventure / comedy / sports / learning / slice-of-life |
| picture_book | rhythm / folk_tale / concept / bedtime |
| other | — |

### 設計

#### DBスキーマ変更

```sql
-- supabase/migrations/20260330000002_book_sub_genres.sql

-- booksテーブルにサブジャンルを追加（グローバルキャッシュ）
ALTER TABLE public.books
  ADD COLUMN sub_genre text,
  ADD COLUMN theme_tags text[];

COMMENT ON COLUMN public.books.sub_genre IS
  'AI付与のサブジャンル（例: fantasy, science, biography）';
COMMENT ON COLUMN public.books.theme_tags IS
  'AI付与のテーマタグ配列（例: {friendship, magic, animal}）';
```

#### サブジャンル付与フロー

```
本の登録 (barcode / search)
    ↓
書誌取得（タイトル・著者・description）
    ↓
バックグラウンドで AI にサブジャンル付与を依頼
    ↓
books.sub_genre / books.theme_tags を更新
```

#### API Route: サブジャンル付与

```typescript
// app/api/ai/sub-genre/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: Request) {
  const { bookId, title, author, description, genre } = await req.json();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5', // コスト最適化: 分類タスクはHaikuで十分
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `以下の本のサブジャンルとテーマタグを JSON で返してください。

タイトル: ${title}
著者: ${author}
ジャンル: ${genre}
説明: ${description ?? 'なし'}

返答形式（JSON のみ。説明不要）:
{"sub_genre": "string", "theme_tags": ["string", "string"]}

sub_genre は英語の小文字スネークケース1語。
theme_tags は最大3語。`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    const { sub_genre, theme_tags } = JSON.parse(text);
    // supabase で books テーブルを更新（service role使用）
    // ...
    return Response.json({ sub_genre, theme_tags });
  } catch {
    return Response.json({ error: 'parse_error' }, { status: 422 });
  }
}
```

> **注**: 新規登録時のみ実行。既存の books レコードはバッチで順次付与。
> サブジャンル付与は best-effort（失敗してもレコード登録はブロックしない）。

---

## 4-2: AI 橋渡しレコメンド（Sprint C・最重要）

### ゴール

図鑑・学習マンガを主に読む子どもに対し、その子の興味に近い「物語の本」を 1〜3 冊提案する。
ペルソナ評価で特定された最大の課題（物語読書ゼロの子どもへのアプローチ）に直接対応する。

### 発火条件

- 子どもの読書記録で story ジャンルの冊数 = 0（または全体の 20% 未満）
- かつ zukan または manga の記録が 3 冊以上ある

### UI 配置

**子どもホーム画面**（既存の「おすすめ」セクションを拡充）

```
┌─────────────────────────────────┐
│ 🌉 ものがたり、よんでみよう？    │
│                                 │
│ ずかんがすきなきみに おすすめ！  │
│                                 │
│ ┌──────┐ ┌──────┐ ┌──────┐    │
│ │表紙  │ │表紙  │ │表紙  │    │
│ │      │ │      │ │      │    │
│ │タイトル│ │タイトル│ │タイトル│    │
│ └──────┘ └──────┘ └──────┘    │
│        もっとみる →             │
└─────────────────────────────────┘
```

### 設計

#### Server Action: 橋渡しレコメンド取得

```typescript
// lib/ai/bridge-recommend.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface BridgeRecommendation {
  title: string;
  author: string;
  reason: string; // 子ども向け文言（ひらがな）
  isbn13?: string;
  coverUrl?: string;
}

export async function getBridgeRecommendations(params: {
  childAge: number;
  ageMode: 'junior' | 'standard';
  topGenres: string[]; // ['zukan', 'manga'] など
  topThemeTags: string[]; // ['science', 'nature'] など
  recentTitles: string[]; // 最近読んだ本のタイトル（重複回避）
  maxItems?: number;
}): Promise<BridgeRecommendation[]> {
  const {
    childAge,
    ageMode,
    topGenres,
    topThemeTags,
    recentTitles,
    maxItems = 3,
  } = params;

  const genreDesc = topGenres
    .map((g) => ({ zukan: '図鑑・ノンフィクション', manga: 'マンガ', story: '物語', picture_book: '絵本', other: 'その他' }[g] ?? g))
    .join('・');

  const themeDesc = topThemeTags.length > 0 ? `（特に${topThemeTags.join('・')}が好き）` : '';

  const systemPrompt = `あなたは子ども向け読書アドバイザーです。
小学${childAge <= 8 ? '低' : '高'}学年の子どもに、${genreDesc}${themeDesc}の興味を活かして楽しめる物語の本を提案してください。
- 実在する日本の子ども向け書籍のみ提案すること
- 最近読んだ本と重複しないこと: ${recentTitles.join('、') || 'なし'}
- JSON 配列のみ返答すること（説明文不要）`;

  const userPrompt = `${maxItems}冊の物語の本を以下の形式で提案してください：
[{"title": "本のタイトル", "author": "著者名", "reason": "${ageMode === 'junior' ? 'ひらがなで30文字以内のおすすめ理由' : '40文字以内のおすすめ理由'}"}]`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5', // レコメンドは Haiku でコスト最適化
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

  try {
    const items = JSON.parse(text) as BridgeRecommendation[];
    return items.slice(0, maxItems);
  } catch {
    return [];
  }
}
```

#### キャッシュ戦略

- Supabase テーブル `ai_recommendations` にキャッシュを保存（TTL: 3 日）
- 同一 child_id + 同一インプットハッシュなら API 呼び出しをスキップ
- 月次 cron で古いキャッシュをクリア

```sql
-- supabase/migrations/20260330000003_ai_recommendations.sql
CREATE TABLE public.ai_recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id      uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  family_id     uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  rec_type      text NOT NULL CHECK (rec_type IN ('bridge', 'general', 'synopsis')),
  input_hash    text NOT NULL, -- SHA-256 of input parameters
  payload       jsonb NOT NULL, -- 推薦結果
  model_used    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '3 days',
  UNIQUE (child_id, rec_type, input_hash)
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family members can view recommendations"
  ON public.ai_recommendations FOR SELECT
  USING (public.is_family_member(family_id));
```

#### Server Action ラッパー

```typescript
// app/actions/ai-recommend.ts
'use server';

import { createHash } from 'crypto';
import { getBridgeRecommendations } from '@/lib/ai/bridge-recommend';
import { getChildrenForCurrentUser } from '@/lib/db/family';
import { createClient } from '@/lib/supabase/server';

export async function fetchBridgeRecommendations(childId: string) {
  // 権限チェック: 自分のファミリーの子どもか
  const children = await getChildrenForCurrentUser();
  const child = children.find((c) => c.id === childId);
  if (!child) throw new Error('unauthorized');

  const supabase = await createClient();

  // 読書履歴を取得
  const { data: records } = await supabase
    .from('reading_records')
    .select('genre, books(title, sub_genre, theme_tags)')
    .eq('child_id', childId)
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!records || records.length === 0) return [];

  // ジャンル集計
  const genreCounts: Record<string, number> = {};
  const themeCounts: Record<string, number> = {};
  const recentTitles: string[] = [];

  for (const r of records) {
    if (r.genre) genreCounts[r.genre] = (genreCounts[r.genre] ?? 0) + 1;
    const book = r.books as { title?: string; sub_genre?: string; theme_tags?: string[] } | null;
    if (book?.theme_tags) {
      for (const t of book.theme_tags) {
        themeCounts[t] = (themeCounts[t] ?? 0) + 1;
      }
    }
    if (book?.title) recentTitles.push(book.title);
  }

  const storyCount = genreCounts['story'] ?? 0;
  const totalCount = records.length;

  // 発火条件チェック
  if (storyCount / totalCount >= 0.2) return []; // 物語が 20% 以上なら橋渡し不要

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  const topThemeTags = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  // キャッシュキー生成
  const inputHash = createHash('sha256')
    .update(JSON.stringify({ topGenres, topThemeTags }))
    .digest('hex')
    .slice(0, 16);

  // キャッシュ確認
  const { data: cached } = await supabase
    .from('ai_recommendations')
    .select('payload')
    .eq('child_id', childId)
    .eq('rec_type', 'bridge')
    .eq('input_hash', inputHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) return cached.payload as typeof recs;

  // AI 呼び出し
  const childAge = new Date().getFullYear() - (child.birth_year ?? 2015);
  const ageMode = childAge <= 8 ? ('junior' as const) : ('standard' as const);

  const recs = await getBridgeRecommendations({
    childAge,
    ageMode,
    topGenres,
    topThemeTags,
    recentTitles: recentTitles.slice(0, 10),
  });

  if (recs.length > 0) {
    await supabase.from('ai_recommendations').upsert({
      child_id: childId,
      family_id: child.family_id,
      rec_type: 'bridge',
      input_hash: inputHash,
      payload: recs,
      model_used: 'claude-haiku-4-5',
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return recs;
}
```

#### UI コンポーネント

```typescript
// components/kids/BridgeRecommendSection.tsx
'use client';

import { useAgeMode } from '@/lib/kids/age-mode-context';

export function BridgeRecommendSection({
  recommendations,
}: {
  recommendations: BridgeRecommendation[];
}) {
  const mode = useAgeMode();

  if (recommendations.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className={mode === 'junior' ? 'text-lg font-bold' : 'text-base font-semibold'}>
        🌉 {mode === 'junior' ? 'ものがたり、よんでみよう？' : '物語にもチャレンジ！'}
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        {mode === 'junior'
          ? 'きみのすきなことがつまった ものがたりだよ！'
          : 'あなたの興味に合った物語の本を選びました'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {recommendations.map((rec, i) => (
          <RecommendCard key={i} rec={rec} mode={mode} />
        ))}
      </div>
    </section>
  );
}
```

---

## 4-1: AI やさしいあらすじ（Sprint D）

### ゴール

本の詳細ページで、Claude API による子ども向けあらすじを表示する。
年齢適応 UI と連動し、低学年はひらがな優先・短文、高学年は漢字混じり・少し詳しい内容にする。

### 設計

#### API Route（SSE ストリーミング）

```typescript
// app/api/ai/synopsis/route.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get('isbn');
  const title = searchParams.get('title') ?? '';
  const author = searchParams.get('author') ?? '';
  const ageMode = (searchParams.get('ageMode') ?? 'standard') as 'junior' | 'standard';

  const systemPrompt =
    ageMode === 'junior'
      ? `あなたは小学校低学年向けの読書ガイドです。
本のあらすじをひらがな中心（必要な場合のみ漢字）・2〜3文・わくわくする言葉で書いてください。
文字数: 80字以内。句読点を適切に使い、読みやすくしてください。`
      : `あなたは小学生向けの読書ガイドです。
本のあらすじを分かりやすく・3〜4文で書いてください。
漢字と平仮名を適切に混ぜ、小学4〜6年生が読めるレベルにしてください。
文字数: 120字以内。`;

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `「${title}」（${author}）のあらすじを書いてください。`,
      },
    ],
  });

  // Server-Sent Events としてストリーミング
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
          );
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

#### キャッシュ

- `ai_recommendations` テーブルの `rec_type = 'synopsis'` で保存
- キャッシュキー: `isbn13` または `title+author` ハッシュ
- TTL: 30 日（あらすじは変わらないため長め）

#### UI: 本の詳細ページ

```typescript
// components/kids/AISynopsisSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAgeMode } from '@/lib/kids/age-mode-context';

export function AISynopsisSection({ isbn, title, author }: Props) {
  const mode = useAgeMode();
  const [synopsis, setSynopsis] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ isbn: isbn ?? '', title, author, ageMode: mode });
    const es = new EventSource(`/api/ai/synopsis?${params}`);

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setLoading(false);
        es.close();
        return;
      }
      const { text } = JSON.parse(e.data);
      setSynopsis((prev) => prev + text);
    };

    return () => es.close();
  }, [isbn, title, author, mode]);

  return (
    <div className="rounded-lg bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-800 mb-2">
        ✨ {mode === 'junior' ? 'どんなおはなし？' : 'どんな本？'}
      </h3>
      {loading && !synopsis ? (
        <div className="animate-pulse h-16 bg-amber-100 rounded" />
      ) : (
        <p className="text-sm leading-relaxed">{synopsis}</p>
      )}
    </div>
  );
}
```

---

## 4-3: AI 汎用レコメンド（Sprint D）

### ゴール

読書記録（ジャンル・スタンプ・感情タグ）から「次の一冊」を提案する。
橋渡しレコメンドが発火しない子ども（すでに物語を読んでいる子）向け。

### 設計

4-2 の `getBridgeRecommendations` と同様の構造で `getGeneralRecommendations` を実装。

**入力パラメータ:**

- 最近読んだ本（最大 5 冊）のタイトル・ジャンル・スタンプ評価
- 好きな感情タグ（「ドキドキした」「笑った」など頻出タグ）
- 子どもの年齢・モード

**プロンプト戦略:**

```
「スタンプ: 🌟（すごくよかった）」「タグ: ドキドキした / 笑った」の傾向から、
その子が好きそうな次の本（実在する日本の子ども書籍）を3冊提案
```

**UI 配置:** 子どもホームの「おすすめ」セクション（橋渡しが表示されない場合に代わりに表示）

---

## 4-4: カーリル API 連携（Sprint E）

### ゴール

AI レコメンドで提案された本が「近くの図書館にあるか」を表示する。
子どもが「読んでみよう！」となったときの次のアクション導線を整備する。

### 設計

#### 外部 API

[カーリル API](https://calil.jp/doc/api.html)（無料・要 API キー登録）

- エンドポイント: `https://api.calil.jp/check`
- 入力: ISBN、都道府県または市区町村コード
- 出力: 図書館名 + 在庫ステータス（貸出可能/貸出中/館内のみ）

#### 環境変数

```
CALIL_API_KEY=xxx
```

#### API Route

```typescript
// app/api/library/check/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isbn = searchParams.get('isbn');
  const pref = searchParams.get('pref') ?? ''; // 都道府県（任意）

  if (!isbn) return Response.json({ error: 'isbn required' }, { status: 400 });

  const url = new URL('https://api.calil.jp/check');
  url.searchParams.set('appkey', process.env.CALIL_API_KEY ?? '');
  url.searchParams.set('isbn', isbn);
  if (pref) url.searchParams.set('pref', pref);
  url.searchParams.set('format', 'json');
  url.searchParams.set('callback', '0');

  const res = await fetch(url.toString());
  const data = await res.json();
  return Response.json(data);
}
```

#### UI

- 本詳細ページ（AI レコメンドのカード展開時）に「📚 近くの図書館で探す」ボタンを配置
- タップで都道府県選択→在庫状況を表示
- **親設定で都道府県を事前保存可能**（毎回選択しなくて済む）

---

## 4-6: AI コスト管理 & 品質評価（Sprint E）

### コスト管理

#### モデル使い分け戦略

| タスク | モデル | 理由 |
|--------|--------|------|
| サブジャンル付与 (4-8) | `claude-haiku-4-5` | 分類タスク・大量バッチ |
| 橋渡しレコメンド (4-2) | `claude-haiku-4-5` | レコメンドは精度より速度 |
| 汎用レコメンド (4-3) | `claude-haiku-4-5` | 同上 |
| やさしいあらすじ (4-1) | `claude-haiku-4-5` | 短文生成・ストリーミング |
| 将来の AIチャット (5-1) | `claude-sonnet-4-6` | 会話品質が重要 |

#### リクエスト数上限

```typescript
// lib/ai/rate-limit.ts
import { withCache } from '@/lib/books/cache'; // 既存のキャッシュ仕組みを流用

const AI_DAILY_LIMIT_PER_CHILD = 10; // 1 子ども/日あたりの AI 呼び出し上限

export async function checkAIRateLimit(childId: string): Promise<boolean> {
  // Supabase で当日のリクエスト数をカウント
  // ...
}
```

#### Supabase テーブル: AI 利用ログ

```sql
-- supabase/migrations/20260330000004_ai_usage_log.sql
CREATE TABLE public.ai_usage_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id    uuid REFERENCES public.children(id) ON DELETE SET NULL,
  task_type   text NOT NULL, -- 'synopsis', 'bridge', 'general', 'sub_genre'
  model_used  text NOT NULL,
  input_tokens  int,
  output_tokens int,
  cached      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_log_family_date
  ON public.ai_usage_log (family_id, created_at DESC);
```

### 品質評価

#### KPI 定義

| 指標 | 定義 | 目標値 |
|------|------|--------|
| 橋渡し採用率 | 橋渡しレコメンドで表示された本が記録に追加された率 | ≥ 15% |
| 汎用レコメンドクリック率 | 表示→カード展開の率 | ≥ 30% |
| あらすじ表示率 | 本詳細ページでのあらすじ表示回数/詳細ページ表示回数 | — |
| キャッシュヒット率 | キャッシュ利用率（コスト効率の指標） | ≥ 60% |

#### 計測の仕組み

```sql
-- ai_recommendations テーブルに採用カラムを追加
ALTER TABLE public.ai_recommendations
  ADD COLUMN impression_count int NOT NULL DEFAULT 0,
  ADD COLUMN click_count int NOT NULL DEFAULT 0,
  ADD COLUMN adoption_count int NOT NULL DEFAULT 0; -- 実際に記録された数
```

親ダッシュボードの「分析」タブで簡易表示（Phase 5 で本格化）。

---

## 4-5: 読書ポイント（Backlog・Step 5 移動候補）

### 判断

Step 4 のスコープは AI 機能に集中するため、読書ポイントは **Step 5 に移動を推奨**。
理由: ポイント・本棚カスタマイズは独立した機能で、AI 機能の完成度に依存しない。

### 暫定スコープ（Step 4 内でやる場合）

- 記録完了時に `+10pt` 付与（ジャンル/スタンプに応じたボーナス）
- 子どもホームに現在のポイント表示
- 本棚の背景色をポイントで変更（3 〜 5 種）

---

## DB マイグレーション一覧

| ファイル名 | 内容 |
|-----------|------|
| `20260330000001_age_mode_override.sql` | `children.age_mode_override` 列追加 |
| `20260330000002_book_sub_genres.sql` | `books.sub_genre`, `books.theme_tags` 列追加 |
| `20260330000003_ai_recommendations.sql` | AI レコメンドキャッシュテーブル |
| `20260330000004_ai_usage_log.sql` | AI 利用ログテーブル |

---

## 環境変数

`.env.local` に追加が必要な変数:

```env
ANTHROPIC_API_KEY=sk-ant-...  # Claude API キー
CALIL_API_KEY=xxx              # カーリル API キー（4-4 実装時）
```

`lib/env.ts` のスキーマ更新:

```typescript
const envSchema = z.object({
  // ... 既存のフィールド
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY が設定されていません'),
  CALIL_API_KEY: z.string().optional(), // 4-4 実装時まで optional
});
```

---

## 依存パッケージ

```bash
npm install @anthropic-ai/sdk
```

> `package.json` の `dependencies` に追加。

---

## フェーズ間の依存関係（Step 4 内）

```
Sprint A: 4-7（年齢適応UI）
    ↓
Sprint B: 4-8（2層ジャンル）
    ↓
Sprint C: 4-2（橋渡しレコメンド）
    │
    ├── Sprint D: 4-1（あらすじ） ← 4-7 の ageMode に依存
    │
    └── Sprint D: 4-3（汎用レコメンド）← 4-8 のサブジャンルで精度向上
          ↓
    Sprint E: 4-6（コスト管理）← 全 AI 機能のロギング
    Sprint E: 4-4（カーリルAPI）← 4-2/4-3 のレコメンドに付随
```

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| AI が存在しない本を提案する | ユーザー信頼低下 | Google Books API で ISBN 確認後にのみ表示 |
| API コスト超過 | 運営コスト増加 | Haiku 優先・キャッシュ・日次上限設定 |
| 低学年向け文言がまだ難しい | 子どもの離脱 | プロンプトに字数制限・ひらがな指示を明記、A/B テスト |
| カーリル API の在庫が古い | 図書館に行ったら空振り | 「確認が必要な場合があります」の注意書きを添える |
| サブジャンル付与の精度が低い | レコメンドの精度低下 | best-effort 扱い・手動修正 UI は Phase 6 以降 |

---

## 受け入れ条件（Sprint C 完了時点）

- [ ] 物語記録が全体の 20% 未満の子どもに橋渡しレコメンドが表示される
- [ ] 推薦された本は実在する日本の子ども向け書籍であること（手動確認サンプル 10 件）
- [ ] 低学年モードの推薦理由文はひらがな中心であること
- [ ] キャッシュヒット時は API を呼ばずにレスポンスが返ること
- [ ] AI 呼び出し失敗時はセクション非表示（エラー画面にしない）

---

_本設計は開発の進行に合わせて随時見直してください。_
