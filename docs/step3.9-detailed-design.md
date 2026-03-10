# Step 3.9 詳細設計: 導線最適化（ボタン/メニュー/表示順）

作成日: 2026-03-10  
更新日: 2026-03-10（完了状況反映）  
前提: Step 3.8 完了済み。Step 4（AI機能）着手前に実施。  
参照:
- [アプリ内導線 改善提案（2026-03-10）](./navigation-ui-improvement-proposal-2026-03-10.md)
- [フェーズ計画 v2](./phase-plan-v2.md)

---

## 1. 目的

Step 3.9 は「機能追加」ではなく、既存機能の到達性を高めるための導線再編フェーズ。

- 親: 「今日やること」への到達を最短化
- 子: 「記録する」までの迷いを最小化
- 全体: 画面間でボタンの意味・強弱・配置ルールを統一

---

## 2. スコープ

### 対象

- 保護者: `/dashboard`, `/children/[childId]`, `/records/[recordId]`
- キッズ: `/kids/home`, `/kids/records/new`, `/kids/messages`, `/kids/calendar`

### 非対象（Step 4/5で対応）

- AI提案ロジック自体
- DBスキーマの大規模変更
- 通知基盤（配信キュー等）

---

## 3. 実施順序（3スプリント）

```
Sprint A: 3.9-1 固定ナビ行 → 3.9-2 ダッシュボード表示順 → 3.9-3 キッズホーム情報順
Sprint B: 3.9-4 ボタン階層統一 → 3.9-5 空状態テンプレ共通化
Sprint C: 3.9-6 導線KPI計測実装・計測検証
```

### 実装ステータス（2026-03-10）

- ✅ Sprint A 実装完了
- ✅ Sprint B 実装完了
- ✅ Sprint C 実装完了（イベント送信 + API受け口 + 主要導線への埋め込み）

---

## 4. 3.9-1 固定ナビ行（戻る + タイトル + 主CTA）

### 課題

- 戻る導線がテキストリンク中心でタップ領域が小さい。
- 画面ごとに戻る位置が異なり、学習コストが高い。

### 設計

共通コンポーネントを追加し、主要画面ヘッダを統一する。

#### 新規コンポーネント

- `components/app-top-nav.tsx`

```tsx
// propsイメージ
{
  backHref?: string;
  backLabel?: string;
  title: string;
  primaryAction?: React.ReactNode;
  sticky?: boolean;
}
```

#### レイアウトルール

- 左: 戻る（アイコン + ラベル、最小44x44px）
- 中央: ページタイトル（1行省略）
- 右: 主CTA（1画面1つ）
- `sticky top-0 z-20` を基本（モバイルで常時アクセス）

### 適用先

- `/kids/messages`, `/kids/calendar`, `/kids/records/new`
- `/children/[childId]`, `/records/[recordId]`

### 受け入れ条件

- [x] 上記画面で戻る位置が統一される
- [x] 戻るタップ領域が 44px 以上
- [x] 主CTAがある画面では右上配置に統一

---

## 5. 3.9-2 ダッシュボード表示順再編

### 課題

- サマリーが先に表示され、即時行動（やること）が後段にある。

### 新表示順

1. 今日のやること（`DashboardActions`）
2. 子ども別クイックアクション（`DashboardChildrenTabs` 内）
3. 今月サマリー
4. よく使うメニュー（設定系）

### 実装ポイント

- `app/dashboard/page.tsx` のセクション順入れ替え
- `components/dashboard-children-tabs.tsx` にクイックCTAを追加
  - `＋記録`
  - `最新を見る`

### 受け入れ条件

- [x] 初期表示1スクロール内に「今日のやること」が含まれる
- [x] 子どもタブ内から1タップで記録追加へ遷移できる

---

## 6. 3.9-3 キッズホーム情報順最適化

### 課題

- 未読メッセージなど緊急度の高い情報がナビカードより後にある。

### 新表示順

1. 通知帯（未読メッセージ / 期限付きミッション）
2. 2x2 ナビカード
3. 最近読んだ本
4. バッジ・おすすめ

### 実装ポイント

- `app/kids/home/page.tsx` で通知系セクションを上段へ移動
- 未読 > 0 のとき、通知帯から `/kids/messages` への明確CTA表示

### 受け入れ条件

- [x] 未読ありの場合、通知帯が最上段に表示される
- [x] 通知帯からメッセージ画面へ遷移可能

---

## 7. 3.9-4 ボタン階層統一（Primary / Secondary / Tertiary）

### 課題

- ページごとに強調色や形が乱立し、主操作が不明瞭。

### 設計ルール

- Primary: 1画面1つ（最重要）
- Secondary: 2〜3個まで（補助）
- Tertiary: テキストリンク（戻る/詳細）

### クラス指針（Tailwind）

- Primary: `rounded-lg bg-orange-600 text-white ...`
- Secondary: `rounded-lg border bg-white text-slate-700 ...`
- Tertiary: `text-sm text-blue-600 underline ...`

### 実装対象

- `components/kid-record-form.tsx`
- `app/kids/messages/page.tsx`
- `app/children/[childId]/page.tsx`

### 受け入れ条件

- [x] 各画面で Primary は1つのみ（重複導線はキッズホームで解消済み）
- [x] 既存導線を壊さず見た目ルールが統一される

---

## 8. 3.9-5 空状態テンプレート共通化

### 課題

- 空状態ごとの文言・CTA配置が不統一。

### 設計

新規コンポーネント:
- `components/empty-state-card.tsx`

```tsx
{
  icon: string;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}
```

### 適用先

- `/kids/messages`（0件）
- `/children/[childId]`（0件）
- `/kids/calendar`（月内0件）

### 受け入れ条件

- [x] 空状態で「次に押す1ボタン」が必ず提示される
- [x] 画面間でレイアウトが統一される

---

## 9. 3.9-6 KPI/イベント計測

### 目的

導線改善を主観ではなく、イベントで効果検証可能にする。

### 追加イベント

- `dashboard_action_click`
- `dashboard_child_quick_add_click`
- `kid_home_notice_click`
- `kid_home_nav_click`
- `record_create_start`
- `record_create_submit`
- `kid_message_mark_read`

### 実装方針

- 既存のServer Action/Client handlerで `trackEvent()` を呼ぶ
- 子どもID・画面名・導線種別を属性に付与

### 成功指標（2週間平均）

- ホーム→記録開始時間: -20%
- 記録完了率: +8%以上
- メッセージ既読化率: +15%以上

---

## 10. 実装ファイル一覧（予定）

### 新規

- `components/app-top-nav.tsx`
- `components/empty-state-card.tsx`
- `lib/analytics/navigation-events.ts`

### 変更

- `app/dashboard/page.tsx`
- `components/dashboard-children-tabs.tsx`
- `app/kids/home/page.tsx`
- `app/kids/messages/page.tsx`
- `app/kids/calendar/page.tsx`
- `app/kids/records/new/page.tsx`
- `app/children/[childId]/page.tsx`
- `app/records/[recordId]/page.tsx`
- `components/kid-record-form.tsx`

---

## 11. リスクと緩和

- リスク: UI変更で既存ユーザーが一時的に迷う
  - 緩和: 段階的ロールアウト（画面単位）
- リスク: CTA統一で色依存の既存認知が崩れる
  - 緩和: 変更前後でクリック率比較
- リスク: 計測イベントの取りこぼし
  - 緩和: E2Eシナリオでイベント発火を検証

---

## 12. テスト計画

- 単体: コンポーネント表示分岐（通知あり/なし、空状態）
- 結合: 主要導線（dashboard→child→record, kids/home→records/new）
- E2E: 代表2フロー
  1. 親: ダッシュボード → 今日のやること → コメント
  2. 子: ホーム → 記録作成 → 完了

---

## 13. 完了定義（Definition of Done）

- [x] 3.9-1〜3.9-6 の受け入れ条件を満たす
- [x] KPIイベントが本番相当環境で取得できる（初期実装: API受け口 + ログ出力）
- [x] `phase-plan-v2` から Step 3.9 詳細設計へリンクされている
- [x] 主要画面のUI差分レビューが完了している
