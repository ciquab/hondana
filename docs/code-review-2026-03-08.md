# 「ほんだな」コードベース総合評価 (2026-03-08)

## 全体的な印象

Next.js 15 (App Router) + Supabase + Tailwind CSS という堅実なスタックで構築されており、全体的に**よく整理されたコードベース**。特にセキュリティ面（RLS、HMAC署名セッション、PIN scryptハッシュ、タイミングセーフ比較、IDOR対策）は入念に設計されている。

## 良い点

1. **セキュリティ設計が優秀**: RLS、HMAC署名付きkid_sessionクッキー、scryptによるPINハッシュ、`timingSafeEqual`/`burnPinVerifyCost`によるタイミング攻撃対策、監査ログ
2. **Zodによる一貫したバリデーション**: Server Actions入口でのバリデーションが徹底されている
3. **環境変数の起動時検証** (`lib/env.ts`): 設定ミスを早期発見できる
4. **書籍検索の多段フォールバック**: Google Books → NDL → OpenBD と冗長性がある
5. **インメモリキャッシュ**: APIレート制限対策として適切に実装
6. **マイグレーション管理**: 細かい粒度でSQLマイグレーションが管理されている

## AI機能実装前に改善すべき点

### 1. `getRecordCountsForChildren` のパフォーマンス問題 (重要度: 高)

**`lib/db/records.ts:38-53`** - 全レコードの `child_id` を取得してJSでカウントしている。データ量が増えるとメモリ・帯域の問題になる。

```typescript
// 現在: 全行を取得してJSでカウント
const { data } = await supabase
  .from('reading_records')
  .select('child_id')
  .in('child_id', childIds);
```

**推奨**: Supabase の `.select('child_id.count()')` またはRPC関数でDB側でカウントする。`getMonthlyReadCountsForChildren` (L89-109)も同様の問題がある。

### 2. `getCurrentUser()` の重複呼び出し (重要度: 高)

**`lib/db/family.ts`** で `getFamiliesForCurrentUser()` と `getChildrenForCurrentUser()` がそれぞれ独立して `getCurrentUser()` を呼び、さらに `getCurrentUser()` 内で `createClient()` を呼んでいる。`dashboard/page.tsx` では両方が呼ばれるため、認証確認が4回行われる。

**推奨**: ユーザーIDを引数として渡すか、request-scopedなキャッシュ(`React.cache`等)を導入する。

### 3. `records/[recordId]/page.tsx` がクライアントコンポーネントで全データをフェッチ (重要度: 高)

**`app/records/[recordId]/page.tsx`** - 本来サーバーコンポーネントで初期データを取得すべきところを、全て `'use client'` でクライアントサイドフェッチしている。初回表示時に空のローディング画面が表示され、SEOにも不利。

**推奨**: サーバーコンポーネントで初期データを取得し、インタラクティブ部分(リアクション、コメント投稿)のみをクライアントコンポーネントに分離する。

### 4. `ActionResult` 型の統一されていない定義 (重要度: 中)

`ActionResult` が複数箇所で異なる形で定義されている:
- `app/actions/record.ts:8-10` - `{ error?: string }`
- `app/actions/family.ts:11-15` - `{ error?: string; inviteCode?: string; ok?: string }`
- `app/actions/kid-record.ts:10-12` - `KidRecordActionResult { error?: string }`
- `app/actions/suggest-book.ts:6` - `{ error?: string; success?: boolean }`

**推奨**: 共通のベース型を定義し、各アクション固有の拡張は型パラメータで表現する。

### 5. `GoogleBookResult` 型が全API結果の共通型として使われている (重要度: 中)

**`lib/books/ndl.ts:13`** と **`lib/books/openbd.ts:33`** が `GoogleBookResult` をimportして返値型に使っている。名前が誤解を招く。

**推奨**: `BookSearchResult` などの汎用的な名前に変更する。

### 6. テストカバレッジが低い (重要度: 高)

テストは純粋なユーティリティ関数のみ（合計331行、7ファイル）。Server Actions、DB関数、APIルート、コンポーネントのテストがない。

**推奨**:
- Server Actionsの単体テスト（Supabaseをモック）
- `/api/books/search` のインテグレーションテスト
- 主要コンポーネントのレンダリングテスト

### 7. エラーハンドリングの一貫性 (重要度: 中)

書籍検索API系は `catch` で黙って空配列を返す設計だが、ユーザーに「検索に失敗した」のか「結果がない」のか区別できない。

**推奨**: Result型（`{ data, error }` パターン）を導入し、エラーと「結果なし」を区別する。

### 8. `GENRE_LABELS` の重複定義 (重要度: 低)

`lib/kids/feelings.ts:5-11` と `app/children/[childId]/page.tsx:8-14` で同じジャンルラベルが異なる形式で定義されている。

**推奨**: 一箇所にまとめる。

### 9. クライアントサイドの Supabase クライアントが毎回新規作成される (重要度: 中)

**`lib/supabase/client.ts`** - `createClient()` が呼ばれるたびに新しいインスタンスが作られる。`records/[recordId]/page.tsx` では複数回呼ばれている。

**推奨**: シングルトンパターンでキャッシュする。

### 10. 外部画像URLのサニタイズ不足 (重要度: 中)

Google Books / OpenBD から取得した `coverUrl` がそのまま `<img src>` に渡されている（`eslint-disable` で警告を抑制）。

**推奨**: `next/image` の `remotePatterns` を設定して `<Image>` コンポーネントを使う。または最低限、URLスキームの検証(`https://`のみ許可)を入れる。

### 11. AI機能に備えた構造的な準備 (重要度: 高)

- **`lib/ai/` ディレクトリの設計**: プロバイダー抽象化レイヤー
- **レスポンスのストリーミング基盤**: Server-Sent Events や ReadableStream を扱うユーティリティ
- **非同期ジョブの仕組み**: AI処理は時間がかかるため、プログレス表示の仕組みが必要
- **コスト管理**: ユーザーごとのAI API呼び出し回数制限（既存の `rate-limit.ts` を拡張可能）

## 優先度付きの改善ロードマップ

| 優先度 | 項目 | 理由 |
|--------|------|------|
| **P0** | テストカバレッジ強化 | AI機能追加でリグレッションを防ぐ基盤が必須 |
| **P0** | records詳細ページのSSR化 | パフォーマンス・UX改善、AI機能表示の基盤 |
| **P1** | getCurrentUser()の重複呼び出し解消 | AI機能追加で呼び出し回数がさらに増える |
| **P1** | DBカウントクエリの最適化 | データ増加に備える |
| **P1** | BookSearchResult型のリネーム | AI機能で書籍データを扱う際の混乱を防ぐ |
| **P2** | ActionResult型の統一 | AI応答も同じパターンで扱える |
| **P2** | エラー/空結果の区別 | AI処理のエラーハンドリングで重要 |
| **P2** | 外部画像のnext/image対応 | セキュリティとパフォーマンス |
| **P3** | GENRE_LABELS重複解消 | メンテナンス性 |
| **P3** | Supabaseクライアントのシングルトン化 | 微最適化 |
