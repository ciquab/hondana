# ほんだな Step1 設計提案（MVP）

## 0. 設計の前提（今回の判断軸）
- **最優先は子どものデータ保護**とし、MVPでは「家族外共有」を一切入れない。
- 初学者でも運用しやすいように、認証は複雑化させず、**親のみ通常ログイン**から開始する。
- 将来機能（AI、PINログイン、通知、ゲーミフィケーション）は、テーブル拡張で吸収できる形にする。
- RLS は段階導入としつつ、**MVP本番投入時には家族境界テーブルへ必須適用**する。

---

## 1. MVPで本当に必要な最小機能（Phase1の削ぎ落とし）

### 1-1. ユーザー/権限
- 親アカウント作成（メール+パスワード or Magic Link）
- ファミリー作成（親1人がオーナー）
- 子どもプロフィール作成（子どもは**MVPでは単独ログインしない**）
- 親が「子どもを選択」して代理入力する

### 1-2. 読書記録
- 本を登録する（MVPは最初は手動入力＋ISBN任意）
  - タイトル（必須）
  - 著者（任意）
  - ISBN（任意）
  - 表紙URL（任意）
- 子どもに紐づく読書記録を追加
  - ステータス（`want_to_read` / `reading` / `finished`）
  - 感想メモ（任意）
  - 読了日（任意）

### 1-3. 閲覧
- 子どもごとの記録一覧
- 記録詳細表示

### 1-4. 親リアクション（最小）
- 親コメント（MVPでは同一家族の親のみ）
- いいねは後回し（DBは拡張しやすい形にしておく）

### 1-5. 今回MVPから外すもの
- 子どもPINログイン
- バーコードスキャン
- 外部書誌API連携
- AI要約・AIチャット・レコメンド
- バッジ、ポイント、通知
- オフライン同期

> 理由: 「認証・家族境界・記録CRUD・閲覧」の中核を先に固めると、後の機能追加時にデータ漏洩リスクを最小化できる。

---

## 2. 推奨ディレクトリ構成（Next.js App Router, MVP向け）

```text
hondana/
  app/
    (public)/
      login/page.tsx
      signup/page.tsx
    (app)/
      layout.tsx
      dashboard/page.tsx                 # 子ども一覧
      children/[childId]/page.tsx        # 子どもの記録一覧
      children/[childId]/records/new/page.tsx
      records/[recordId]/page.tsx        # 記録詳細
      settings/family/page.tsx
    api/
      records/route.ts                   # 必要最小限のBFF
      comments/route.ts
  components/
    ui/
    forms/
    books/
    records/
  lib/
    auth/
      config.ts                          # NextAuth設定
      server.ts                          # getServerSession helper
    supabase/
      client.ts                          # Browser client
      server.ts                          # Server client
    db/
      queries/
        children.ts
        records.ts
        comments.ts
      types.ts
    validations/
      record.ts
      child.ts
  middleware.ts                          # 認証ガード
  docs/
    step1-mvp-design.md
  supabase/
    migrations/
      20260303_000001_init.sql
    seed.sql
  README.md
```

### 構成の意図
- `app/(public)` と `app/(app)` を分け、認証境界を視覚的に明確化。
- DBアクセスは `lib/db/queries` に寄せ、RLS前提でも呼び出し箇所を絞る。
- Supabaseマイグレーションをリポジトリ管理し、環境差分による事故を防ぐ。

---

## 3. Supabase最小テーブル設計（MVP用）

## 3-1. テーブル一覧
1. `families`
2. `family_members`
3. `children`
4. `books`
5. `reading_records`
6. `record_comments`

## 3-2. 最小スキーマ（概念）

### `families`
- `id (uuid, pk)`
- `name (text, not null)`
- `created_at`

### `family_members`
- `id (uuid, pk)`
- `family_id (uuid, fk -> families)`
- `user_id (uuid, not null)` ※ Supabase auth.users.id
- `role (text, check in ['owner','parent'])`
- `created_at`
- `unique(family_id, user_id)`

### `children`
- `id (uuid, pk)`
- `family_id (uuid, fk -> families)`
- `display_name (text, not null)`
- `birth_year (int, null)`
- `created_at`

### `books`
- `id (uuid, pk)`
- `isbn13 (text, null, unique)`
- `title (text, not null)`
- `author (text, null)`
- `cover_url (text, null)`
- `created_at`

### `reading_records`
- `id (uuid, pk)`
- `family_id (uuid, fk -> families)`
- `child_id (uuid, fk -> children)`
- `book_id (uuid, fk -> books)`
- `status (text, check in ['want_to_read','reading','finished'])`
- `memo (text, null)`
- `finished_on (date, null)`
- `created_by (uuid, not null)` ※ 親の auth user id
- `created_at`, `updated_at`

### `record_comments`
- `id (uuid, pk)`
- `record_id (uuid, fk -> reading_records)`
- `family_id (uuid, fk -> families)`
- `author_user_id (uuid, not null)`
- `body (text, not null)`
- `created_at`

## 3-3. インデックス（最低限）
- `family_members (user_id)`
- `children (family_id)`
- `reading_records (family_id, child_id, created_at desc)`
- `record_comments (record_id, created_at)`

## 3-4. RLS導入ステップ
- **Step A（開発初期）**: RLSポリシーは `families / family_members / children / reading_records / record_comments` のみ先に実装。
- **Step B（MVP公開前）**: 全テーブルでRLS `ON`。`books` は `select` 広め可、`insert/update` は認証ユーザー制限。
- **Step C（将来）**: 監査列（`updated_by` 等）と操作ログテーブルを追加。

---

## 4. 認証方針（初心者向けに安全でシンプル）

## 4-1. 方針
- **MVPは「親のみログイン」**
- 子どもは親セッション内でプロフィール選択
- NextAuth + Supabase（DB）を使うが、認証プロバイダは最初1種類に限定

## 4-2. 推奨構成
- NextAuth Provider: Email（Magic Link）または Credentials（メール+パスワード）
  - 初心者には Magic Link が運用しやすい
- セッションは httpOnly Cookie
- `middleware.ts` で `(app)` 配下を保護
- API Route では必ず `session.user.id` を起点に family membership を確認

## 4-3. セキュリティ必須ルール
- 「`child_id` を受け取ったら必ず family 所属確認」
- クライアント送信の `family_id` は信用しない（サーバーで再解決）
- コメント投稿時は `record_id` の family と `session.user` の family 一致を検証
- エラーメッセージに「存在有無」を出し分けない（列挙攻撃対策）

## 4-4. 子どもPINログインへの将来拡張
- `children` に `pin_hash`, `pin_enabled_at` を追加できる余地を残す
- PIN認証は親権限でオン/オフ、失敗回数制限とロック時間を別テーブルで管理
- MVP時点では未実装で問題なし

---

## 5. 実装ステップ（Day1 / Day2 / Day3）

## Day1: 土台を作る（認証と家族境界）
- Next.js App Router 初期化 + Tailwind 設定
- NextAuth 最小設定（親ログイン）
- Supabaseプロジェクト作成
- `families`, `family_members`, `children` マイグレーション
- `middleware.ts` で認証必須ルート保護
- 初回ログイン時に「家族を作成する」画面実装

**完了条件**
- 親がログイン→家族作成→子どもプロフィール作成まで通る

## Day2: 読書記録の中核CRUD
- `books`, `reading_records` マイグレーション
- 記録作成フォーム（手動本登録含む）
- 子どもごとの記録一覧・詳細
- サーバー側バリデーション（Zod）
- 最小RLS（family境界）適用

**完了条件**
- 親が任意の子どもに対して読書記録を作成/閲覧できる
- 別家族のデータにアクセス不可

## Day3: コメント + 安全性仕上げ
- `record_comments` マイグレーション
- コメント投稿/表示
- APIの認可チェック強化（IDOR対策）
- 監査ログ用の共通ロガー（最低限）
- E2Eで「家族Aが家族Bを見れない」を検証

**完了条件**
- コメントが家族内のみ表示
- 基本ユースケースが通るMVPデモ可能状態

---

## 6. この設計で将来拡張しても破綻しない理由

- **family_id を主要テーブルに保持**しているため、常に家族境界で絞り込み可能。
- `books` を独立テーブル化しており、後で Google Books/国会図書館API同期を追加しやすい。
- `reading_records.status` は enum相当で管理しており、将来ステータス追加が容易。
- コメントを独立させたことで、将来「いいね」「通知」「親おすすめ」を同様の関連テーブルで拡張できる。
- 子ども認証を後付けする際も、`children` 中心設計なので PIN カラム/認証テーブル追加で対応可能。
- RLSを早期から家族境界に適用するため、機能追加時も「ポリシー流用」で安全性を維持できる。

---

## 7. 次に合意してから着手する項目（実装前チェックリスト）
- 親ログイン方式を **Magic Link** と **メール+パスワード** のどちらにするか
- MVPで子ども何人までを想定するか（UIとseedデータに影響）
- 記録入力項目（memo/読了日/ステータス）の必須・任意確定
- Day2時点でバーコード入力を入れるか（UIのみ先行か）
- 本番公開前RLSレビューの担当とチェック観点
