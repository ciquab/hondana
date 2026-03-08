# ほんだな (hondana)

家族向け読書記録アプリ「ほんだな」の実装リポジトリです。
親が子どもの読書を見守り、子どもが楽しく読書を記録できるプラットフォームです。

## 機能概要

### 親向け機能
- メール+パスワードによるサインアップ / ログイン
- 家族作成・QRコード / 招待コードによる家族招待
- 子どもプロフィール管理（表示名・生まれ年・PIN設定）
- 子どもの読書記録タイムライン・ジャンル分析・月次サマリー
- 記録へのリアクション（❤️ / 👍 / 🌟 / 👏）とコメント

### 子ども向け機能（キッズモード）
- 4桁PINによるログイン（ロックアウト保護つき）
- 読書記録の作成（バーコードスキャン / 書名検索 / 手入力）
- スタンプ評価・気持ちタグ・ひとことメモ
- 本棚ビュー（ジャンル別タブ）・読書カレンダー
- 親からのコメント・リアクション確認
- バッジ（読書実績）表示

### 書籍検索
- バーコードスキャン（BarcodeDetector API / @zxing/library フォールバック）
- Google Books API
- 国立国会図書館（NDL）API
- OpenBD API

## 技術スタック

| 領域 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router) + React 19 + TypeScript 5 |
| スタイリング | Tailwind CSS |
| データベース / 認証 | Supabase (PostgreSQL + Auth + RLS) |
| バリデーション | Zod |
| バーコード | @zxing/library |

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーして値を設定してください。

```bash
cp .env.example .env.local
```

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー（サーバー専用） | ✅ |
| `KID_SESSION_SECRET` | 子どもセッション署名用シークレット | ✅ |
| `SUPABASE_JWT_SECRET` | JWT 検証用シークレット | ✅ |
| `GOOGLE_BOOKS_API_KEY` | Google Books API キー | 推奨 |

> **注意：** `SUPABASE_SERVICE_ROLE_KEY` / `KID_SESSION_SECRET` / `SUPABASE_JWT_SECRET` はサーバー専用です。`NEXT_PUBLIC_` プレフィックスを付けないでください。

`KID_SESSION_SECRET` は以下のコマンドで生成できます：
```bash
openssl rand -base64 32
```

### 3. データベースのセットアップ

`supabase/migrations/` 内の SQL ファイルをファイル名昇順で Supabase に適用してください。

```bash
# Supabase CLI を使う場合
supabase link --project-ref <PROJECT_ID>
supabase db push
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## ルーティング

### 親向け（要ログイン）

| パス | 説明 |
|------|------|
| `/login` | ログイン / サインアップ |
| `/dashboard` | ホーム（子ども一覧・月次サマリー） |
| `/settings/family` | 家族設定 |
| `/settings/children` | 子どもプロフィール管理 |
| `/invite` | 家族招待コード受け入れ |
| `/children/[childId]` | 子どもの記録タイムライン |
| `/children/[childId]/records/new` | 読書記録の追加 |
| `/records/[recordId]` | 記録詳細（コメント・リアクション） |

### 子ども向け（キッズモード）

| パス | 説明 |
|------|------|
| `/kids/login` | PIN ログイン |
| `/kids/home` | キッズホーム |
| `/kids/records` | 本棚（ジャンル別） |
| `/kids/records/new` | 読書記録の作成 |
| `/kids/records/[recordId]` | 記録詳細 |
| `/kids/calendar` | 読書カレンダー |
| `/kids/messages` | 親からのメッセージ |

## セキュリティ

- Supabase RLS で家族単位のデータ分離
- Next.js middleware で未認証アクセスをブロック（保護ルート: `/dashboard` / `/settings` / `/children` / `/records`）
- 子どもセッションは署名付き httpOnly Cookie で管理
- PIN 連続誤入力によるロックアウト保護

## 主要ドキュメント

| ドキュメント | 内容 |
|------------|------|
| `docs/deployment.md` | 本番デプロイ手順（Vercel + Supabase） |
| `docs/security-audit-log-runbook.md` | 監査ログ運用ランブック |
| `docs/spec-v0.2.md` | 現行仕様書 |
| `docs/phase-plan-v2.md` | フェーズ計画・ロードマップ |

## 開発コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run lint         # Lint 実行
npm run format       # コードフォーマット
npm run format:check # フォーマットチェック
