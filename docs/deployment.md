# デプロイ手順

このアプリは **Next.js + Supabase** 構成です。
推奨デプロイ先は **Vercel**（フロントエンド）+ **Supabase**（データベース・認証）です。

---

## 前提条件

- [Vercel](https://vercel.com) アカウント
- [Supabase](https://supabase.com) プロジェクト（本番用）
- Node.js 18 以上

---

## 1. Supabase の準備

### 1-1. 本番プロジェクトの作成

1. Supabase ダッシュボードで新しいプロジェクトを作成する
2. プロジェクトの **Settings → API** から以下の値を取得する：
   - `NEXT_PUBLIC_SUPABASE_URL`（Project URL）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon / public key）
   - `SUPABASE_SERVICE_ROLE_KEY`（service_role key）

### 1-2. マイグレーションの適用

`supabase/migrations/` 内の SQL ファイルを**ファイル名の昇順**で本番 DB に適用する。

Supabase CLI を使う場合：

```bash
# Supabase CLI のインストール（未インストールの場合）
npm install -g supabase

# 本番プロジェクトにリンク（PROJECT_ID は Supabase ダッシュボードで確認）
supabase link --project-ref <PROJECT_ID>

# マイグレーションを本番 DB に適用
supabase db push
```

手動で適用する場合は、Supabase ダッシュボードの **SQL Editor** でファイルを順番に実行してください。

---

## 2. 環境変数の準備

以下の環境変数を用意します（`.env.example` を参照）。

| 変数名 | 説明 | 公開範囲 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | クライアント・サーバー |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー | クライアント・サーバー |
| `SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー（高権限） | **サーバーのみ** |
| `KID_SESSION_SECRET` | 子どもセッション署名用シークレット | **サーバーのみ** |

> **注意：** `SUPABASE_SERVICE_ROLE_KEY` と `KID_SESSION_SECRET` は絶対にクライアントに露出させないでください。`NEXT_PUBLIC_` プレフィックスを付けないこと。

### KID_SESSION_SECRET の生成

推測困難なランダム文字列を生成して使用してください：

```bash
openssl rand -base64 32
```

---

## 3. Vercel へのデプロイ

### 3-1. リポジトリの接続

1. [Vercel ダッシュボード](https://vercel.com/dashboard) にログイン
2. **Add New Project** → GitHub リポジトリ（`hondana`）を選択
3. Framework Preset が **Next.js** になっていることを確認

### 3-2. 環境変数の設定

Vercel の **Settings → Environment Variables** に以下を設定：

```
NEXT_PUBLIC_SUPABASE_URL      = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY     = eyJ...
KID_SESSION_SECRET            = (openssl rand -base64 32 の出力)
```

環境（Production / Preview / Development）ごとに値を分けることを推奨します。

### 3-3. デプロイの実行

1. **Deploy** ボタンをクリック
2. ビルドログを確認し、エラーがないことを確かめる
3. デプロイ完了後、発行された URL でアプリにアクセスして動作確認

### 3-4. 以降の更新

`main` ブランチへの push で自動デプロイが実行されます。

---

## 4. デプロイ後の確認チェックリスト

- [ ] トップページ（`/`）が表示される
- [ ] 親アカウントでサインアップ・ログインできる
- [ ] 家族・子どもの作成ができる
- [ ] 読書記録の登録・表示ができる
- [ ] 子どもモード（`/kids`）でPINログインできる
- [ ] QRコードによる家族招待が動作する

---

## 5. トラブルシューティング

### ビルドエラー

```
Type error: ...
```

ローカルで `npm run build` を実行してエラーを再現・修正してからプッシュしてください。

### 認証が機能しない

- Supabase ダッシュボードの **Authentication → URL Configuration** に Vercel のデプロイ URL（例: `https://your-app.vercel.app`）を **Site URL** として追加してください。
- **Redirect URLs** にも同じ URL を追加してください。

### 子どもモードにログインできない

- `KID_SESSION_SECRET` が設定されているか確認してください。
- Vercel の Environment Variables に設定されているか確認してください（`NEXT_PUBLIC_` は付けない）。

### マイグレーションエラー

マイグレーションの適用順序を確認してください。`supabase/migrations/` 内のファイルを**ファイル名昇順**で適用する必要があります。

---

## 参考リンク

- [Vercel + Next.js デプロイガイド](https://nextjs.org/docs/deployment)
- [Supabase CLI ドキュメント](https://supabase.com/docs/guides/cli)
- [Supabase Auth の URL 設定](https://supabase.com/docs/guides/auth/redirect-urls)
