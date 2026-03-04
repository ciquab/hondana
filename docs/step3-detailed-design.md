# Step 3 詳細設計提案（子ども向け体験）

対象: `docs/phase-plan-v2.md` の Step 3（3-1〜3-7）

## 1. 設計の目的

Step 3 の目的は「子どもが自分で使える」「毎日開きたくなる」体験を、既存の家族スコープ/RLS を壊さずに追加することです。

- **使いやすさ**: 文字入力を最小化し、タップ中心で完結
- **継続性**: 記録→達成（バッジ）→可視化（カレンダー）のループを設計
- **安全性**: 子どもセッションは家族内データに限定、親機能と明確に権限分離
- **拡張性**: Step 4/5（AI・通知）へつながるデータ構造を先に整える

## 2. スコープ（Step 3-1〜3-7）

### In Scope
- 3-1 子ども PIN ログイン
- 3-2 スタンプ評価
- 3-3 気持ちタグ
- 3-4 読書バッジ
- 3-5 読書カレンダー
- 3-6 ファミリー招待（コード/QR）
- 3-7 おやからのメッセージ画面

### Out of Scope（Step 4 以降へ送る）
- AI 要約、AI レコメンド、AI チャット
- Push 通知基盤
- ポイント消費型カスタマイズ

## 3. UX 設計（子ども導線）

### 3.1 主要フロー
1. 子どもログイン画面で子どもを選択
2. PIN 4桁入力（またはイラスト選択方式）
3. ホーム（今日の記録、バッジ進捗、メッセージ未読）
4. 本を記録（既存登録導線を子ども向けUIに最適化）
5. スタンプ評価 + 気持ちタグを選択
6. 保存時にバッジ判定→獲得演出
7. カレンダーで記録を振り返る

### 3.2 画面一覧
- `/kids/login`
- `/kids/home`
- `/kids/records/new`
- `/kids/calendar`
- `/kids/messages`
- `/family/invite`（親向け）

## 4. ドメインモデル / DB 提案

既存テーブルは維持し、以下を追加します。

### 4.1 `child_auth_methods`
子ども認証方式を管理。

- `id` (uuid, pk)
- `child_id` (uuid, fk -> children.id, unique)
- `pin_hash` (text, nullable) ※平文保存禁止
- `pin_failed_count` (int, default 0)
- `pin_locked_until` (timestamptz, nullable)
- `illustration_secret` (text, nullable) ※選択式用
- `updated_at` / `created_at`

制約:
- `pin_hash` または `illustration_secret` のどちらかを必須（将来は両方可）

### 4.2 `record_reactions_child`
読書記録に対する子どものスタンプ評価。

- `id` (uuid, pk)
- `record_id` (uuid, fk -> reading_records.id)
- `child_id` (uuid, fk -> children.id)
- `stamp` (text, enum: `great`, `fun`, `ok`, `hard`)
- `created_at`

制約:
- `unique(record_id, child_id)`（1記録1スタンプ）

### 4.3 `record_feeling_tags`
気持ちタグの多対多。

- `id` (uuid, pk)
- `record_id` (uuid, fk -> reading_records.id)
- `child_id` (uuid, fk -> children.id)
- `tag` (text) 例: `ドキドキ`, `笑った`, `かなしかった`, `びっくり`
- `created_at`

制約:
- `unique(record_id, child_id, tag)`

### 4.4 `badges` / `child_badges`
バッジ定義と獲得履歴。

`badges`
- `id` (text, pk) 例: `first_book`, `ten_books`, `seven_day_streak`
- `name`
- `description`
- `icon`
- `criteria_type` (text)
- `criteria_value` (jsonb)

`child_badges`
- `id` (uuid, pk)
- `child_id` (uuid)
- `badge_id` (text)
- `awarded_at` (timestamptz)
- `source_record_id` (uuid, nullable)

制約:
- `unique(child_id, badge_id)`

### 4.5 `family_invites`
招待コード/QR を管理。

- `id` (uuid, pk)
- `family_id` (uuid)
- `code` (text, unique)
- `expires_at` (timestamptz)
- `max_uses` (int)
- `used_count` (int)
- `created_by` (uuid)
- `revoked_at` (timestamptz, nullable)
- `created_at`

### 4.6 `child_message_views`
親コメント既読管理。

- `id` (uuid, pk)
- `child_id` (uuid)
- `comment_id` (uuid)
- `viewed_at` (timestamptz)

制約:
- `unique(child_id, comment_id)`

## 5. RLS / 権限設計

- 親セッション: 既存通り family スコープで CRUD
- 子どもセッション: `child_session` クレームをJWTに付与し、`child_id` + `family_id` に限定
- 重要方針: 子どもは
  - 自分の記録作成/更新のみ可
  - 他の子どもの記録閲覧不可（親が許可する場合のみ将来拡張）
  - 招待作成不可（親専用）

RLS 例（概念）:
- `record_reactions_child`: `auth.jwt()->>'child_id' = child_id`
- `child_badges`: 同上
- `family_invites`: `auth.uid()` が親メンバーのみ

## 6. API 設計（App Router）

### 6.1 認証
- `POST /api/kids/auth/start`
  - 入力: `childId`
  - 出力: challenge情報（PIN/illustration）
- `POST /api/kids/auth/verify-pin`
  - 入力: `childId`, `pin`
  - 出力: 子どもセッショントークン

### 6.2 記録補助
- `POST /api/kids/records/:recordId/stamp`
- `PUT /api/kids/records/:recordId/tags`

### 6.3 バッジ
- `GET /api/kids/badges`
- `POST /api/internal/badges/evaluate`（record作成直後にサーバー側で実行）

### 6.4 カレンダー
- `GET /api/kids/calendar?month=YYYY-MM`
  - 出力: 日付ごとの読書有無、スタンプ、冊数

### 6.5 招待
- `POST /api/family/invites`
- `POST /api/family/invites/redeem`
- `POST /api/family/invites/:id/revoke`

### 6.6 メッセージ
- `GET /api/kids/messages`
- `POST /api/kids/messages/:commentId/read`

## 7. バッジ判定ロジック（初期セット）

初期バッジ:
- `first_book`: 初回記録
- `ten_books`: 通算10冊
- `seven_day_streak`: 連続7日記録
- `many_feelings`: 異なる気持ちタグを10種類使用

実装方針:
- 記録作成トランザクション後に評価関数を呼ぶ
- 付与済みチェックは `child_badges unique` で二重付与を防止
- 判定処理は idempotent（再実行しても結果同じ）

## 8. パフォーマンス / 運用

- カレンダーAPIは月単位集計を返し、日別詳細は必要時ロード
- バッジ進捗は `materialized view` もしくはキャッシュ（将来）
- PIN 試行回数制限: 5回失敗で 15分ロック
- 監査ログ: 認証失敗、招待発行/利用/失効

## 9. 実装順（推奨）

### Milestone A（基盤）
- DB migration: `child_auth_methods`, `record_reactions_child`, `record_feeling_tags`
- 子どもセッションの土台（JWT claim / middleware）
- 3-1, 3-2, 3-3 の最小動作

### Milestone B（継続機能）
- `badges`, `child_badges`
- バッジ評価ジョブ/関数
- 3-4, 3-5

### Milestone C（家族拡張）
- `family_invites`
- 招待コード/QR UI
- 3-6

### Milestone D（コミュニケーション）
- `child_message_views`
- 子ども向けメッセージ画面
- 3-7

## 10. 受け入れ基準（Step 3 完了条件）

- 子どもが PIN でログインできる
- 記録時にスタンプ・気持ちタグを選べる
- バッジが自動付与され、獲得履歴が表示できる
- 月次カレンダーで読書日が可視化される
- 家族招待をコード/QRで実行できる
- 子ども画面で親からのコメント/リアクションを既読管理付きで確認できる
- 既存親機能/RLSを壊さず `npm run lint` / `npm run build` が通る

## 11. リスクと対策

- **PIN セキュリティ不足**: hash化、試行回数制限、ロック導入
- **過剰ゲーミフィケーション**: 通知や演出の頻度制御、親設定でON/OFF
- **カレンダー集計遅延**: 月単位API + index最適化
- **招待コード漏洩**: 失効、使用回数制限、有効期限短縮

## 12. Step 4/5 への接続ポイント

- 気持ちタグとスタンプ履歴は Step 4 の推薦特徴量に転用可能
- `child_message_views` は Step 5 の通知既読モデルにそのまま拡張可能
- バッジ進捗は将来ポイント機能（Step 4-4）の入力に再利用可能
