# Step 3.8 詳細設計: 習慣化 UX & 記録体験強化

作成日: 2026-03-09
前提: Step 3.7b 完了済み。Step 4（AI 機能）の前に実施。
参照:
- [UI/UX ペルソナ評価と改善提案](./persona-based-uiux-review-2026-03-09.md)
- [5パターンペルソナ評価](./persona-ux-evaluation-5patterns-2026-03-09.md)

---

## 目的

Step 3.7b で「記録の入口の壁」を取り除いた。Step 3.8 では **記録できるようになったユーザーが「続けたくなる」** 仕組みを構築する:

1. **ミッション機能**: 親子で共有する週次目標で「次に読む理由」を作る
2. **親ダッシュボード強化**: 「今日やること」を明確にし、親の伴走コストを下げる
3. **記録完了画面**: 「保存→終了」を「保存→達成感→報告→次のアクション」に進化
4. **おすすめ導線修正**: タップしても何も起きない「死に導線」を解消
5. **読み聞かせ対応**: 低年齢児の「よんでもらった」体験を記録可能にする

---

## 実施順序

```
Sprint A: 3.8-6（読み聞かせ）→ 3.8-1 + 3.8-1b（ミッション基盤）
Sprint B: 3.8-2 + 3.8-2b（ダッシュボード強化）→ 3.8-4（おすすめ導線）
Sprint C: 3.8-5（記録完了画面）← ミッション進捗表示との統合が必要なため最後
```

---

## 3.8-6: 「よんでもらった」ステータス追加

### 現状の問題

記録フォームの「さいごまでよんだ？」は `finished`（読了）/ `reading`（途中）の2択。
6歳のゆいちゃん（P1）は親に読み聞かせてもらった本を記録したいが、「じぶんで読んだ」のか「読んでもらった」のか区別できない。

### 設計方針

- DB の `status` CHECK 制約に `'read_aloud'` を追加
- フォームの「さいごまでよんだ？」に第3選択肢を追加
- 既存の `finished` / `reading` の動作には影響しない
- 本棚・記録詳細での表示ラベルを追加

### DB 変更

```sql
-- マイグレーション: ALTER CHECK constraint
ALTER TABLE reading_records DROP CONSTRAINT reading_records_status_check;
ALTER TABLE reading_records ADD CONSTRAINT reading_records_status_check
  CHECK (status IN ('want_to_read', 'reading', 'finished', 'read_aloud'));
```

### バリデーション変更

**ファイル**: `lib/validations/kid-record.ts`

```typescript
// status enum に 'read_aloud' を追加
status: z.enum(['want_to_read', 'reading', 'finished', 'read_aloud']),
```

**ファイル**: `lib/validations/record.ts`

```typescript
export const READING_STATUSES = ['want_to_read', 'reading', 'finished', 'read_aloud'] as const;

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: '読みたい',
  reading: '読書中',
  finished: '読了',
  read_aloud: '読み聞かせ',
};
```

### フォーム変更

**ファイル**: `components/kid-record-form.tsx`

くわしくモード（`mode === 'detailed'`）の「さいごまでよんだ？」に第3ボタンを追加:

```tsx
<fieldset>
  <legend className="mb-2 text-sm font-medium">
    さいごまでよんだ？
  </legend>
  <div className="grid grid-cols-3 gap-2">  {/* 2→3 cols */}
    <button type="button" onClick={() => setFinished('finished')} ...>
      📖 さいごまでよんだ！
    </button>
    <button type="button" onClick={() => setFinished('reading')} ...>
      🔖 とちゅうまで
    </button>
    <button type="button" onClick={() => setFinished('read_aloud')} ...>
      👂 よんでもらった
    </button>
  </div>
</fieldset>
```

> **注**: `finished` state の型を `boolean` → `'finished' | 'reading' | 'read_aloud'` に変更。
> かんたんモードのデフォルト hidden 値は `'finished'` のまま（読み聞かせは意図的に選ぶ操作）。

### 表示変更

**ファイル**: `app/kids/records/[recordId]/page.tsx`

ステータスバッジに `read_aloud` の表示を追加:

```tsx
// status === 'read_aloud' の場合
<span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
  👂 よんでもらった
</span>
```

### 受け入れ条件

- [ ] DB の `status` に `'read_aloud'` が保存可能
- [ ] 記録フォーム（くわしくモード）に「👂 よんでもらった」ボタンが表示される
- [ ] かんたんモードでは表示されない（デフォルト `finished`）
- [ ] 記録詳細画面で `read_aloud` が正しくラベル表示される
- [ ] 既存の `finished` / `reading` にリグレッションがない
- [ ] バッジ判定は `read_aloud` も `finished` と同等に読了カウント対象とする

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/YYYYMMDD_read_aloud.sql` | CHECK 制約変更 |
| `lib/validations/kid-record.ts` | status enum 追加 |
| `lib/validations/record.ts` | READING_STATUSES / STATUS_LABELS 追加 |
| `components/kid-record-form.tsx` | 第3ボタン追加、finished state 型変更 |
| `app/kids/records/[recordId]/page.tsx` | ステータスバッジ追加 |
| `supabase/migrations/*_step3_milestone_b.sql` 内の badge RPC | `read_aloud` を読了扱いに含めるよう条件修正 |

### 工数見積もり

**小〜中**（DB制約変更 + フォーム3ボタン化 + バッジRPC修正）

---

## 3.8-1: 親子ミッション「ものがたりチャレンジ」

### 概要

親が週次目標（例: 「物語を1冊読もう」）を設定し、子ども画面で進捗を可視化する仕組み。

### DB 設計

```sql
-- ミッションテンプレート（システム定義）
CREATE TABLE mission_templates (
  id text PRIMARY KEY,
  title text NOT NULL,           -- 'ものがたりを1さつよもう'
  description text,              -- 子ども向け説明文
  target_type text NOT NULL,     -- 'genre_count' | 'total_count' | 'streak_days'
  target_genre text,             -- 'story' | null（全ジャンル対象なら null）
  target_value int NOT NULL,     -- 目標値（例: 1冊、3日）
  period text NOT NULL DEFAULT 'weekly',  -- 'weekly' | 'monthly'
  difficulty text NOT NULL DEFAULT 'normal', -- 'easy' | 'normal' | 'challenge'
  icon text NOT NULL DEFAULT '📖',
  sort_order int NOT NULL DEFAULT 0
);

-- 子どもに割り当てられたミッション（親が設定）
CREATE TABLE child_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES mission_templates(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,   -- 週次なら started_at + 7 days
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'expired')),
  current_progress int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: family_id スコープ
ALTER TABLE child_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_missions" ON child_missions
  FOR ALL USING (family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));
```

### ミッションテンプレート（初期データ）

```sql
INSERT INTO mission_templates (id, title, description, target_type, target_genre, target_value, difficulty, icon, sort_order) VALUES
  ('story_1',   'ものがたりを 1さつ よもう',     'ものがたりの ほんを 1さつ よんでみよう！',    'genre_count', 'story', 1, 'easy',      '📖', 1),
  ('story_3',   'ものがたりを 3さつ よもう',     'ものがたりの ほんを 3さつ よめるかな？',      'genre_count', 'story', 3, 'normal',    '📖', 2),
  ('any_3',     'なんでも 3さつ よもう',         'すきなほんを 3さつ よんでみよう！',           'total_count', NULL,    3, 'easy',      '📚', 3),
  ('any_5',     '5さつ チャレンジ',              '1しゅうかんで 5さつ よめるかな？',            'total_count', NULL,    5, 'normal',    '📚', 4),
  ('new_genre', 'あたらしいジャンルに チャレンジ', 'まだよんだことない ジャンルの ほんを よもう！', 'new_genre',   NULL,    1, 'challenge', '🌟', 5),
  ('streak_3',  '3にち れんぞく よもう',         '3にち つづけて きろくしよう！',                'streak_days', NULL,    3, 'normal',    '🔥', 6),
  ('read_aloud','よみきかせを 3かい きろくしよう', 'よんでもらったほんも きろくしよう！',          'genre_count', NULL,    3, 'easy',      '👂', 7);
```

### 親側: ミッション設定 UI

**ファイル**: `app/children/[childId]/page.tsx` に設定セクションを追加

```
┌────────────────────────────────────┐
│ 🎯 ミッション設定                   │
│                                    │
│ [現在のミッション]                  │
│  📖 ものがたりを1さつよもう (2/3日) │
│  → 進捗 33%  ████░░░░░░           │
│                                    │
│ [ミッションをかえる ▼]              │
│                                    │
│ テンプレ選択:                       │
│ ○ 📖 ものがたりを1さつよもう (やさしい)    │
│ ● 📚 なんでも3さつよもう (やさしい)        │
│ ○ 📖 ものがたりを3さつよもう (ふつう)      │
│ ○ 🔥 3にちれんぞくよもう (ふつう)          │
│ ○ 🌟 あたらしいジャンルにチャレンジ (挑戦)  │
│                                    │
│ [このミッションをはじめる]          │
└────────────────────────────────────┘
```

### 子ども側: ミッション進捗表示

**ファイル**: `app/kids/home/page.tsx` のナビゲーション直下に配置

```
┌────────────────────────────────────┐
│ 🎯 いまのミッション                 │
│                                    │
│ 📖 ものがたりを 1さつ よもう        │
│                                    │
│ ████████░░░░░░░░  あと 1さつ！      │
│                                    │
│ のこり 3にち                        │
└────────────────────────────────────┘
```

達成時:

```
┌────────────────────────────────────┐
│ 🎉 ミッション たっせい！            │
│                                    │
│ 📖 ものがたりを 1さつ よもう        │
│                                    │
│ ████████████████  クリア！🌟       │
│                                    │
│ すごい！ よくがんばったね！          │
└────────────────────────────────────┘
```

### ミッション進捗更新ロジック

**タイミング**: `createKidRecord()` の保存成功後（バッジ評価と同じ場所）

```typescript
// app/actions/kid-record.ts 内に追加
await updateMissionProgress(childId, {
  genre: resolvedGenre,
  status: status,
});
```

**進捗計算 RPC**:

```sql
CREATE OR REPLACE FUNCTION update_mission_progress(
  target_child_id uuid
) RETURNS void AS $$
DECLARE
  mission RECORD;
  progress int;
BEGIN
  -- active な mission を取得
  SELECT * INTO mission FROM child_missions
    WHERE child_id = target_child_id AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- テンプレートに応じた進捗計算
  SELECT target_type, target_genre, target_value INTO STRICT mission
    FROM mission_templates WHERE id = mission.template_id;

  -- 期間内の記録数を集計して current_progress を更新
  -- genre_count: 指定ジャンルの記録数
  -- total_count: 全記録数
  -- streak_days: 連続記録日数
  -- new_genre: 未読ジャンル記録数

  UPDATE child_missions SET current_progress = progress,
    status = CASE WHEN progress >= mission.target_value THEN 'completed' ELSE 'active' END
    WHERE id = mission.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### サーバーアクション

**ファイル**: `app/actions/mission.ts`（新規）

```typescript
'use server';

export async function setChildMission(
  childId: string,
  templateId: string
): Promise<{ error?: string }> {
  // 1. 既存 active ミッションを expired に
  // 2. 新しいミッションを作成（ends_at = now + 7 days）
  // 3. revalidatePath
}
```

### 受け入れ条件

- [ ] `mission_templates` テーブルに7種のテンプレートが登録される
- [ ] 親が子どもの管理画面からミッションを選択・開始できる
- [ ] 子どもホーム画面にアクティブミッションの進捗バーが表示される
- [ ] 記録保存時にミッション進捗が自動更新される
- [ ] ミッション達成時に達成演出が表示される
- [ ] ミッション期限切れ時に status が `expired` に更新される
- [ ] ミッション未設定時は子ども画面にセクションが表示されない
- [ ] RLS で家族スコープが適用される

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `supabase/migrations/YYYYMMDD_missions.sql` | テーブル・RLS・RPC・初期データ |
| `app/actions/mission.ts` | サーバーアクション（新規） |
| `app/actions/kid-record.ts` | ミッション進捗更新呼び出し追加 |
| `app/children/[childId]/page.tsx` | ミッション設定セクション追加 |
| `app/kids/home/page.tsx` | ミッション進捗表示セクション追加 |
| `components/mission-progress.tsx` | 進捗バーコンポーネント（新規） |
| `components/mission-setup.tsx` | 親用ミッション設定コンポーネント（新規） |

### 工数見積もり

**大**（DB設計 + RPC + サーバーアクション + 親子双方のUI）

---

## 3.8-1b: ミッションテンプレの多様化

### 概要

3.8-1 のテンプレートに加えて、子どものタイプと親の期待に応じたテンプレートバリエーションを追加。

### 追加テンプレート

上記 3.8-1 の初期データに含めて実装する（テーブル構造は同一）。

超低年齢向け「読み聞かせ回数」テンプレ（`read_aloud`）は 3.8-1 の初期データに含まれている。

### 親の設定 UI での表示

テンプレートを難易度別にグループ表示:

```
── やさしい ──
📖 ものがたりを 1さつ よもう
📚 なんでも 3さつ よもう
👂 よみきかせを 3かい きろくしよう

── ふつう ──
📖 ものがたりを 3さつ よもう
🔥 3にち れんぞく よもう
📚 5さつ チャレンジ

── チャレンジ ──
🌟 あたらしいジャンルに チャレンジ
```

### 受け入れ条件

- [ ] テンプレートが難易度別にグループ表示される
- [ ] 読み聞かせ系テンプレが選択肢に含まれる
- [ ] 各テンプレの説明文が子ども向けひらがな基準に準拠

### 工数見積もり

**小**（3.8-1 に含めて実装。追加のテーブル変更なし）

---

## 3.8-2: 親ダッシュボード「今日の3アクション」

### 現状の問題

親ダッシュボード（`app/dashboard/page.tsx`）は「今月の読書まとめ」と「子ども一覧」のみ。
「今日何をすればいいか」が見えず、管理重視の親（Persona C）が使い続けるモチベーションに欠ける。

### 設計方針

ダッシュボード上部（月次サマリーの下）に「今日のやること」カードを最大3件表示。
各カードはワンタップで該当画面に遷移。

### アクション候補と優先順位

| 優先度 | アクション | 条件 | 遷移先 |
|--------|-----------|------|--------|
| 1 | 未返信コメント | 子どもの記録にコメントしていない | `/records/{recordId}` |
| 2 | ミッション未達アラート | 子どものミッション残り2日で未達成 | `/children/{childId}` |
| 3 | 今週未記録の子ども | 今週まだ1冊も記録がない子がいる | `/children/{childId}` |

### サーバー側データ取得

**ファイル**: `lib/db/dashboard-actions.ts`（新規）

```typescript
export type DashboardAction = {
  type: 'uncommented_record' | 'mission_alert' | 'no_records_this_week';
  childName: string;
  childId: string;
  message: string;
  href: string;
  icon: string;
};

export async function getDashboardActions(
  childIds: string[]
): Promise<DashboardAction[]> {
  // 1. 各子どもの未コメント記録を取得（直近7日）
  // 2. ミッション残り2日で未達成を取得
  // 3. 今週記録なしの子どもを取得
  // 4. 優先度順に最大3件返却
}
```

### UI 設計

```
┌────────────────────────────────────┐
│ ✅ きょうの やること                │
│                                    │
│ 💬 こうたの きろくに コメントしよう │
│    「ぐりとぐら」に感想がありません │
│                                → │
│                                    │
│ 🎯 あおいの ミッションが あと2日   │
│    「物語3冊」まであと1冊です       │
│                                → │
│                                    │
│ 📖 れんくんは 今週まだ記録なし     │
│    声かけのチャンスです             │
│                                → │
└────────────────────────────────────┘
```

### 受け入れ条件

- [ ] ダッシュボードに「きょうのやること」セクションが表示される
- [ ] 最大3件のアクションが優先度順に表示される
- [ ] 各アクションをタップすると該当画面に遷移する
- [ ] アクションがない場合は「全部できています！」と表示する
- [ ] パフォーマンス: 追加クエリが2秒以内に完了する

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `lib/db/dashboard-actions.ts` | アクション取得ロジック（新規） |
| `app/dashboard/page.tsx` | アクションセクション追加 |
| `components/dashboard-actions.tsx` | アクションカードコンポーネント（新規） |

### 工数見積もり

**中**（クエリ3本 + UI。ミッションテーブル依存のため 3.8-1 完了後に実装）

---

## 3.8-2b: 親ダッシュボード「今週のハイライト」

### 概要

各子どもの「今週いちばんスタンプが高かった本」を1枚カードで表示。
多読児（P2: たけるくん月15冊）の親が全記録を追わず状況把握できるようにする。

### UI 設計

子ども一覧セクション内、各子どものカードに追加:

```
┌────────────────────────────────────┐
│ 🌟 今週のハイライト                 │
│                                    │
│ [表紙画像] 「はてしない物語」       │
│ 🌟 すごくよかった                   │
│                                    │
│ → きろくをみる                     │
└────────────────────────────────────┘
```

### データ取得

```sql
-- 今週の記録からスタンプ最高値の1件を取得
-- great > fun > ok > hard の順で評価
SELECT r.id, b.title, b.cover_url, rrc.stamp
FROM reading_records r
JOIN books b ON r.book_id = b.id
JOIN record_reactions_child rrc ON rrc.record_id = r.id
WHERE r.child_id = target_child_id
  AND r.created_at >= date_trunc('week', now())
ORDER BY
  CASE rrc.stamp
    WHEN 'great' THEN 1
    WHEN 'fun' THEN 2
    WHEN 'ok' THEN 3
    WHEN 'hard' THEN 4
  END,
  r.created_at DESC
LIMIT 1;
```

### 受け入れ条件

- [ ] 子どもカードに今週のハイライト本が表示される
- [ ] 今週の記録がない場合はセクションが表示されない
- [ ] ハイライトをタップすると記録詳細に遷移する

### 工数見積もり

**小**（クエリ1本 + カードUI）

---

## 3.8-4: 親おすすめカードの死に導線解消

### 現状の問題

子どもホーム画面の「📚 おとなからのおすすめ」セクション（L141-185）は表紙のみ表示で、タップしても何も起きない。

### 設計方針（L0: 簡易詳細）

- 表紙タップで **モーダル** を表示（ページ遷移なし）
- 表示内容: 表紙画像・タイトル・著者
- アクション: 「この本をよむ」→ `/kids/records/new` へ遷移（ISBN/タイトルをクエリパラメータでプリセット）
- Step 3.8 では「よみたいほん」リストへの永続保存は行わない（Step 5-3 で対応）

### UI 設計

```
┌────────────────────────────────────┐
│                [×]                 │
│                                    │
│        [表紙画像 大きめ]            │
│                                    │
│   「はてしない物語」               │
│    ミヒャエル・エンデ              │
│                                    │
│  [📖 このほんを よむ]              │
│  [とじる]                          │
└────────────────────────────────────┘
```

### 実装

**ファイル**: `components/suggestion-detail-modal.tsx`（新規）

```tsx
type Props = {
  suggestion: SuggestionRow;
  onClose: () => void;
};

export function SuggestionDetailModal({ suggestion, onClose }: Props) {
  const recordUrl = `/kids/records/new?title=${encodeURIComponent(suggestion.title ?? '')}&author=${encodeURIComponent(suggestion.author ?? '')}&isbn=${suggestion.isbn13 ?? ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
        {/* 閉じるボタン、表紙、タイトル、著者、CTAボタン */}
      </div>
    </div>
  );
}
```

**ファイル**: `app/kids/home/page.tsx`

おすすめセクションをクライアントコンポーネントに分離し、表紙タップでモーダルを表示。

**ファイル**: `components/kid-record-form.tsx`

クエリパラメータから初期値をプリセットする機能を追加:

```tsx
// URL パラメータからの初期値設定
const searchParams = useSearchParams();
const [title, setTitle] = useState(searchParams.get('title') ?? '');
const [author, setAuthor] = useState(searchParams.get('author') ?? '');
const [isbn, setIsbn] = useState(searchParams.get('isbn') ?? '');
```

### SuggestionRow 型の拡張

現状の `SuggestionRow` に `isbn13` フィールドが不足している場合、RPC `get_kid_suggestions` の返却値に追加。

### 受け入れ条件

- [ ] おすすめの表紙をタップするとモーダルが表示される
- [ ] モーダルに表紙・タイトル・著者が表示される
- [ ] 「このほんをよむ」をタップすると記録フォームに遷移し、タイトル等がプリセットされる
- [ ] 「とじる」でモーダルが閉じる
- [ ] モーダル外タップでも閉じる

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `components/suggestion-detail-modal.tsx` | モーダルコンポーネント（新規） |
| `app/kids/home/page.tsx` | おすすめセクションのクライアント化、モーダル統合 |
| `components/kid-record-form.tsx` | クエリパラメータからの初期値プリセット |
| `supabase/migrations/` | RPC に isbn13 返却追加（必要な場合） |

### 工数見積もり

**中**（モーダル + おすすめセクション分離 + フォームのプリセット機能）

---

## 3.8-5: 記録完了画面の新設

### 現状の問題

記録保存後は `/kids/home` にリダイレクトされるだけ。
達成感が薄く、「保存→終了」で体験が閉じてしまう。

### 設計方針

保存成功後に `/kids/records/complete` に遷移し、達成感のある完了画面を表示。

### UI 設計

```
┌────────────────────────────────────┐
│                                    │
│         🎉 きろく できたよ！        │
│                                    │
│         [表紙画像]                  │
│        「はてしない物語」           │
│         🌟 すごくよかった           │
│                                    │
│  ── ミッション ──                  │
│  📖 ものがたりを1さつよもう         │
│  ████████████████  クリア！🌟      │
│                                    │
│  ── あたらしいバッジ！ ──          │
│  📖 はじめての物語                  │
│                                    │
│  [📣 おうちのひとに おしらせ]       │
│  [📚 もう1さつ とうろく]            │
│  [🏠 ホームにもどる]               │
└────────────────────────────────────┘
```

### 実装

**ファイル**: `app/kids/records/complete/page.tsx`（新規）

```tsx
export default async function RecordCompletePage({
  searchParams
}: {
  searchParams: Promise<{
    recordId?: string;
    badge?: string;
  }>;
}) {
  // recordId から記録情報を取得
  // badge から新規バッジ情報を取得
  // アクティブミッションの進捗を取得
}
```

### リダイレクト変更

**ファイル**: `app/actions/kid-record.ts`

```typescript
// Before:
redirect(newBadge ? `/kids/home?badge=${newBadge.badge_id}` : '/kids/home');

// After:
const params = new URLSearchParams({ recordId });
if (newBadge) params.set('badge', newBadge.badge_id);
redirect(`/kids/records/complete?${params.toString()}`);
```

### 「おうちのひとに おしらせ」ボタン

**Step 3.8 での実装範囲**:
- ボタンタップで「おしらせしたよ！」のフィードバック表示（トースト）
- 実際の通知送信は Step 5-6（通知システム）で実装
- 3.8 ではフィードバック演出のみ（プレースホルダー）

### 受け入れ条件

- [ ] 記録保存後に完了画面に遷移する
- [ ] 完了画面に表紙・タイトル・スタンプが表示される
- [ ] 新規バッジがある場合はバッジ表示される
- [ ] アクティブミッションがある場合は進捗バーが表示される
- [ ] ミッション達成時は達成演出が表示される
- [ ] 「もう1さつとうろく」→ `/kids/records/new` に遷移
- [ ] 「ホームにもどる」→ `/kids/home` に遷移
- [ ] バッジ祝賀モーダル（BadgeCelebration）は完了画面に統合（ホームでの重複表示なし）

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `app/kids/records/complete/page.tsx` | 完了画面（新規） |
| `app/actions/kid-record.ts` | リダイレクト先変更 |
| `components/mission-progress.tsx` | 進捗バー再利用 |

### 工数見積もり

**中**（新規ページ + リダイレクト変更 + ミッション進捗統合）

---

## 全体テスト観点

### 3.8-6: 読み聞かせ

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T6-1 | 「よんでもらった」で保存できる | くわしくモード → 第3ボタン選択 → 保存 → DB 確認 |
| T6-2 | read_aloud がバッジ判定で読了扱い | read_aloud で1冊保存 → first_book バッジ獲得 |
| T6-3 | かんたんモードでは status=finished のまま | かんたんモードで保存 → DB 確認 |
| T6-4 | 記録詳細で「よんでもらった」ラベル | 保存後に記録詳細を確認 |

### 3.8-1: ミッション

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T1-1 | 親がミッションを設定できる | 子ども管理画面 → テンプレ選択 → 開始 |
| T1-2 | 子どもホームにミッション進捗が表示される | ミッション設定後に子どもホーム確認 |
| T1-3 | 記録保存でミッション進捗が更新される | 対象ジャンルの本を記録 → 進捗バー更新確認 |
| T1-4 | ミッション達成で status が completed に | 目標冊数分の記録を保存 → DB 確認 |
| T1-5 | 期限切れでミッションが expired に | 期限過ぎた後に確認（テスト用に短期間設定） |
| T1-6 | ミッション未設定時はセクション非表示 | ミッションなしの子どもでホーム確認 |
| T1-7 | ミッション変更で旧ミッションが expired に | 別テンプレに切り替え → 旧ミッション状態確認 |

### 3.8-2: ダッシュボードアクション

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T2-1 | 未コメント記録がアクションに表示される | 記録をコメントなしにして確認 |
| T2-2 | アクションタップで該当画面に遷移する | 各アクションをタップ |
| T2-3 | アクションなし時は「全部できています」表示 | 全コメント済み・ミッション達成状態で確認 |

### 3.8-4: おすすめ導線

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T4-1 | おすすめ表紙タップでモーダルが開く | 表紙タップ |
| T4-2 | 「このほんをよむ」で記録フォームに遷移 | ボタンタップ → フォームのタイトル確認 |
| T4-3 | フォームにタイトル・著者がプリセットされる | 遷移後のフォーム値確認 |

### 3.8-5: 記録完了画面

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T5-1 | 記録保存後に完了画面に遷移する | 記録保存 → URL 確認 |
| T5-2 | 完了画面に表紙・タイトル・スタンプが表示される | 表示内容確認 |
| T5-3 | 新規バッジがある場合に表示される | 1冊目の記録で確認 |
| T5-4 | ミッション進捗が表示される | ミッション設定後に記録保存 |
| T5-5 | 「もう1さつ」で記録フォームに遷移 | ボタンタップ → URL 確認 |

---

## DB 変更まとめ

| マイグレーション | 内容 |
|-----------------|------|
| `YYYYMMDD_read_aloud.sql` | status CHECK 制約に `read_aloud` 追加 |
| `YYYYMMDD_missions.sql` | `mission_templates` + `child_missions` テーブル、RLS、RPC、初期データ |
| `YYYYMMDD_mission_progress.sql` | ミッション進捗更新 RPC |

---

## Step 4 との接続点

| 3.8 項目 | Step 4 での発展 |
|----------|----------------|
| 3.8-1（ミッション） | 4-2 で AI がミッション内容を子どもの履歴に基づいて自動提案 |
| 3.8-2（ダッシュボード） | 4-3 で AI レコメンドカードをアクションに追加 |
| 3.8-4（おすすめ導線） | 4-1 で AI やさしいあらすじをモーダルに追加 |
| 3.8-5（記録完了画面） | 4-2 で「次のおすすめ」を完了画面に表示 |
| 3.8-6（読み聞かせ） | 4-7 年齢適応UIで低年齢デフォルトを read_aloud に |
