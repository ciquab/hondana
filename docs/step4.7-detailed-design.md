# Step 4-7 詳細設計提案: 年齢適応UIモード + 文言モード連携

作成日: 2026-03-11  
対象: `docs/phase-plan-v2.md` の Step 4-7
前提: A-0（生年推奨入力 / 子ども編集 / `age_mode_override` 追加）実装済み


進捗更新: 2026-03-11
- Sprint A1〜A3（基盤・主要画面適応・計測/AI接続準備）は初期実装済み。
- `get_kid_child_profile` 返却列拡張 migration は、PostgreSQL制約に合わせて `DROP FUNCTION` 後の再作成に修正済み。
- 次作業は適用範囲の段階拡張（A2継続）とUI回帰確認。

---

## 1. 背景と狙い

Step 4-7 の目的は、6歳〜11歳のきょうだいが同じアプリを無理なく使えるように、
**子どもごとに UI 密度・語彙レベル・操作負荷を自動調整**すること。

現行コードでは `children.age_mode_override` の保存と編集UIはあるが、
子ども画面（`/kids/*`）側に適応ロジックはまだ反映されていない。

本提案では、Step 3.7b の「かんたん/くわしく」を土台に、
Step 4 の AI 文言連携に接続できる共通基盤として 4-7 を設計する。

---

## 2. 現状整理（コードベース）

### 実装済み（A-0）

- `children.age_mode_override` 列（`auto/junior/standard`）を保持可能。
- 親は `/settings/children/[id]/edit` で表示名・生年・年齢モードを更新可能。
- `updateChild` で入力検証 + 家族スコープ更新制御済み。

### 実装状況（4-7 本体）

- ✅ `/kids/*`（対象画面）での年齢モード判定と配信を実装。
- ✅ 主要 UI コンポーネントでモード分岐（サイズ・文言・情報量）を第一弾導入。
- ✅ AI 文言（4-1/4-2/4-3）で使う「文言モード」の共通I/F（`TextMode`）を追加。
- ⏳ UI 回帰確認と表現統一（主要 kids 6画面に適用済み）を継続。

---

## 3. スコープ

### In Scope（4-7）

1. **年齢モード決定ロジック**
   - `auto`: 生年から判定（<=8歳: `junior`, >=9歳: `standard`）
   - `junior` / `standard`: 親オーバーライド優先
2. **Kids セッション内コンテキスト化**
   - `/kids/layout.tsx` で解決し、配下コンポーネントへ配信
3. **主要画面のUI適応**
   - `/kids/home`
   - `/kids/records/new`（`KidRecordForm` 含む）
   - `/kids/records/complete`
4. **文言モードヘルパー導入**
   - UI文言と将来のAIレスポンス整形で同じモードを参照可能にする

### Out of Scope（本提案では設計のみ/別タスク）

- 4-1/4-2/4-3 の実装本体
- AI応答本文の自動ふりがな化
- 全画面一括適応（まずは高利用導線を優先）

---

## 4. モード仕様

## 4-1. 型と解決ルール

```ts
export type AgeMode = 'junior' | 'standard';
export type AgeModeOverride = 'auto' | 'junior' | 'standard';
```

優先順位:

1. `age_mode_override` が `junior` / `standard` の場合はそれを採用
2. `auto` の場合は `birth_year` から年齢計算して判定
3. 生年未設定時は `standard` にフォールバック

## 4-2. UIポリシー

| 観点                 | junior                               | standard              |
| -------------------- | ------------------------------------ | --------------------- |
| 主ボタン高さ         | `h-14` 相当                          | `h-10` 相当           |
| 本文サイズ           | `text-base` 中心                     | `text-sm` 中心        |
| 1画面の情報量        | 少なめ（1目的）                      | 通常                  |
| 記録フォーム初期状態 | かんたん固定（くわしくは折りたたみ） | かんたん/くわしく切替 |
| 文言トーン           | ひらがな優先・短文                   | 既存トーン            |

---

## 5. 実装設計

## 5-1. 新規ユーティリティ

### `lib/kids/age-mode.ts`

- `getAgeModeFromProfile({ birthYear, ageModeOverride })`
- `getAgeFromBirthYear(birthYear, now)`
- テストしやすいよう `now` は注入可能にする

### `lib/kids/age-mode-context.tsx`

- `AgeModeProvider`
- `useAgeMode()`

### `lib/kids/age-text.ts`

- `ageText(mode, { junior, standard })` ヘルパー
- JSX で文言分岐を局所化し、可読性を維持

## 5-2. レイアウト統合

### `app/kids/layout.tsx`

- `requireKidContext()` を利用し、現在の child を取得
- `age_mode_override` + `birth_year` をもとに `AgeMode` を決定
- `AgeModeProvider` でラップ

補足:

- 既存の `requireKidContext` が child profile 全項目を返さない場合、
  kid profile RPC の返却列に `birth_year`, `age_mode_override` を追加する。

## 5-3. 画面適応（第一弾）

### A. `app/kids/home/page.tsx`

- ヘッダータイトルを `ageText` で分岐
- ナビカード文言を短文化（junior）
- 主要 CTA の高さをモード分岐

### B. `components/kid-record-form.tsx`

- `useAgeMode()` でモード取得
- `junior` の時:
  - 初期は「かんたん」固定
  - 「くわしく」入力は折りたたみ展開（任意）
  - ジャンル選択を 3カテゴリ簡略表示
- `standard` の時:
  - 現行仕様維持（5カテゴリ + かんたん/くわしく）

### C. `app/kids/records/complete/page.tsx`

- 完了文言を短文化
- 次アクションボタン文言を年齢帯に合わせる

---

## 6. AI文言モード連携I/F（4-1/4-2/4-3への接続）

4-7 の段階で、API入力に以下を渡せる形を先に定義する。

```ts
type TextMode = {
  ageMode: 'junior' | 'standard';
  maxSentenceLength?: number; // junior では短文を強制
  kanaPreferred?: boolean; // junior は true
};
```

- 4-1/4-2/4-3 の API Route/Server Action で `TextMode` を受け取り、
  プロンプト組み立てに利用する。
- 4-7 では UI 側の呼び出し経路だけ先に通し、AI本体は次Sprintで実装。

---

## 7. イベント計測（導線/KPI）

既存の導線イベントに `age_mode` を付与する。

- `kid_home_nav_click`
- `record_create_start`
- `record_create_submit`

追加パラメータ:

```json
{
  "age_mode": "junior" | "standard",
  "child_id": "..."
}
```

評価観点:

- `junior` の記録完了率（開始→保存）
- `junior` のフォーム離脱率
- `standard` との完了時間比較

---

## 8. 段階導入計画

### Sprint A1（基盤）

- `age-mode.ts`, `context`, `age-text` 追加
- `kids/layout` での判定/配信
- 単体テスト追加

### Sprint A2（主要画面適応）

- `kids/home`, `kid-record-form`, `records/complete` の分岐導入
- 既存UI崩れの回帰確認

### Sprint A3（計測 + AI接続準備）

- イベントへの `age_mode` 付与
- `TextMode` I/F を AI 層に定義

---

## 9. テスト計画

## 9-1. 単体テスト

- `getAgeModeFromProfile`:
  - override 優先（auto以外）
  - 生年境界（8/9歳）
  - 生年nullフォールバック

## 9-2. UIテスト（最小）

- `junior` で記録フォームが簡略導線になること
- `standard` で現行機能が維持されること

## 9-3. E2E（将来）

- 子どもA: `junior` 固定 → `/kids/records/new` 完了
- 子どもB: `standard` 固定 → `/kids/records/new` 完了
- 同一家族で表示差分が反映されること

---

## 10. リスクと対策

1. **年齢計算のズレ（誕生日未保持）**
   - 対策: 年単位判定で運用し、境界ズレは override で救済
2. **画面ごとの分岐乱立**
   - 対策: `ageText` / 共通クラス関数へ寄せる
3. **将来のAI機能との乖離**
   - 対策: 4-7時点で `TextMode` I/F を固定して先に接続点を作る

---

## 11. 受け入れ基準（Definition of Done）

- [x] 親設定の `age_mode_override` が `/kids/*` 表示に反映される（対象: home/new/complete + form）
- [x] `auto` の場合に生年から `junior/standard` が自動判定される
- [x] `junior` で主要導線（home/new/complete）の視認性が改善される（第一弾）
- [x] `standard` で既存操作性を劣化させない（回帰確認継続）
- [x] 導線イベントで `age_mode` を計測できる（home nav / record start / submit）
- [x] 4-1/4-2/4-3 側に `TextMode` 入力I/F が用意される

---

## 12. 変更対象ファイル（予定）

### 新規

- `lib/kids/age-mode.ts`
- `lib/kids/age-mode-context.tsx`
- `lib/kids/age-text.ts`
- `lib/kids/__tests__/age-mode.test.ts`

### 変更

- `app/kids/layout.tsx`
- `app/kids/home/page.tsx`
- `components/kid-record-form.tsx`
- `app/kids/records/complete/page.tsx`
- `lib/analytics/navigation-events.ts`（イベント項目拡張）
- （必要なら）kid profile RPC の返却列定義
