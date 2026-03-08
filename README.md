# ほんだな (hondana)

家族向け読書記録アプリ「ほんだな」のMVP実装リポジトリです。

## このPR（Day1）でできること
- 親のサインアップ / ログイン（Supabase Auth, **メール+パスワード方式**）
- ログイン後のガード付き画面遷移
- 家族（family）作成
- 子どもプロフィール作成
- ダッシュボードで子ども一覧表示

## 技術スタック
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth)

## セットアップ
1. 依存インストール
   - `npm install`
2. `.env.example` を `.env.local` にコピーして値を設定
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（子どもPIN認証など server-only 処理で使用）
   - `KID_SESSION_SECRET`（子どもセッション署名用。必須）
3. Supabase SQL を `supabase/migrations/20260303_000001_day1_foundation.sql` の順に適用
4. 開発サーバー起動
   - `npm run dev`

## 認証方式（Day1）
Day1では実装安定性を優先し、**メール+パスワード認証**を採用しています。
Magic Link は次PRで差し替えまたは併用可能です。

## ルーティング（Day1）
- `/login` ログイン / サインアップ
- `/dashboard` 子ども一覧
- `/settings/family` 家族作成
- `/settings/children` 子ども作成

## セキュリティ（Day1）
- middlewareで未ログイン時の保護ルートアクセスを遮断
- Supabase RLS で family 境界を適用（families / family_members / children）
- `family_members` への登録は「自分のユーザーIDのみ」許可

## Day1の未対応（次PR）
- reading_records / books / record_comments
- バーコード・外部API連携
- Zodによる厳密バリデーション
- API Routes/BFF（当面はServer Actions中心）


## 環境変数メモ（子どもモード）
- `KID_SESSION_SECRET` は推測困難なランダム文字列を設定してください。
- `KID_SESSION_SECRET` 未設定時、`/kids/login` は設定不足としてログイン不可になります。
- `SUPABASE_SERVICE_ROLE_KEY` はクライアントへ露出させず、サーバー環境変数としてのみ管理してください。


## セキュリティ運用ドキュメント
- 監査ログ運用ランブック: `docs/security-audit-log-runbook.md`

## デプロイ
本番環境へのデプロイ手順は `docs/deployment.md` を参照してください。
