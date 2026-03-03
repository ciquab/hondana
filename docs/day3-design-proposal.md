# Day3 設計提案: コメント機能 + セキュリティ仕上げ

## 目標

MVP設計書 §5 Day3「コメント + 安全性仕上げ」に基づき、以下を実装する。

### 完了条件（再掲）
- コメントが家族内のみ表示される
- 基本ユースケースが通るMVPデモ可能状態

---

## 1. DBマイグレーション

### `record_comments` テーブル

```sql
create table public.record_comments (
  id              uuid primary key default gen_random_uuid(),
  record_id       uuid not null references public.reading_records on delete cascade,
  family_id       uuid not null references public.families on delete cascade,
  author_user_id  uuid not null,
  body            text not null check (char_length(body) between 1 and 500),
  created_at      timestamptz not null default now()
);
```

- `family_id` を冗長に持たせることで、RLS ポリシーを `reading_records` JOIN なしで評価可能にする（Day2 と同パターン）。

### インデックス

```sql
create index idx_record_comments_record_created
  on public.record_comments (record_id, created_at);
```

### RLS ポリシー

| 操作 | 条件 |
|------|------|
| SELECT | `is_family_member(family_id)` |
| INSERT | `is_family_member(family_id) AND author_user_id = auth.uid()` |
| DELETE | `is_family_member(family_id) AND author_user_id = auth.uid()` |

UPDATE は MVP では不要（コメント編集なし）。

---

## 2. バリデーション

### `lib/validations/comment.ts`

```typescript
createCommentSchema = z.object({
  recordId:  z.string().uuid(),
  body:      z.string().trim().min(1, 'コメントを入力してください').max(500, '500文字以内')
})
```

---

## 3. DBクエリ層

### `lib/db/comments.ts`

| 関数 | 内容 |
|------|------|
| `getCommentsForRecord(recordId)` | `record_comments` を `created_at asc` で取得。RLS が家族フィルタを担当。 |

備考: 投稿者名の表示について、Supabase の `auth.users` は直接 JOIN できないため、MVP では投稿者名を「あなた」/日時のみで表示する。将来的に `profiles` テーブルを追加して名前表示に拡張可能。

---

## 4. Server Action

### `app/actions/comment.ts`

**`createComment(prevState, formData)`**

1. Zod バリデーション
2. `supabase.auth.getUser()` で認証確認
3. `reading_records` から対象レコードの `family_id` を取得（RLS でフィルタ → 取得できなければ IDOR）
4. `record_comments` に INSERT（`family_id`, `author_user_id = user.id`）
5. `revalidatePath` → redirect 不要（同ページに留まる）

---

## 5. UI変更

### 記録詳細ページ `/records/[recordId]/page.tsx` の拡張

現在の構成（Client Component, useEffect で取得）に以下を追加:

1. **コメント一覧セクション**（記録詳細カードの下）
   - 各コメント: 本文 + 投稿日時
   - 自分のコメントには「自分」バッジ
   - 空の場合: 「まだコメントはありません」

2. **コメント投稿フォーム**
   - textarea（1〜500文字）
   - 送信ボタン（`useActionState` で `createComment`）
   - エラー表示

### 画面構成イメージ

```
┌─────────────────────────────────────┐
│  ← 子どもの記録一覧へ戻る           │
├─────────────────────────────────────┤
│  📖 本のタイトル                     │
│  著者名 ・ ISBN                      │
│  [読書中]                            │
│  メモ: ...                           │
│  読了日: 2026-03-01                  │
├─────────────────────────────────────┤
│  ■ 記録を更新                        │
│  ステータス: [____]                  │
│  メモ: [__________]                  │
│  読了日: [____]                      │
│  [更新する]                          │
├─────────────────────────────────────┤
│  ■ コメント（2件）        ← NEW     │
│  ┌─────────────────────────────┐    │
│  │ 自分 ・ 3/2 10:30            │    │
│  │ いい本だったね！              │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 3/3 14:00                    │    │
│  │ また読みたいと言ってました    │    │
│  └─────────────────────────────┘    │
│                                      │
│  [コメントを入力...          ]       │
│  [送信]                              │
└─────────────────────────────────────┘
```

---

## 6. セキュリティ強化（Day3 仕上げ）

### 6-1. IDOR 対策の確認チェックリスト

| アクション | チェック内容 | 実装箇所 |
|-----------|-------------|---------|
| createRecord | `is_child_in_my_family` RPC | app/actions/record.ts ✅ |
| updateRecordStatus | RLS + record 存在確認 | app/actions/record.ts ✅ |
| createComment | record の family_id 照合 | app/actions/comment.ts (NEW) |
| getRecordsForChild | RLS | lib/db/records.ts ✅ |
| getRecordDetail | RLS | lib/db/records.ts ✅ |
| getCommentsForRecord | RLS | lib/db/comments.ts (NEW) |

### 6-2. エラーメッセージ標準化

全 Server Action で、存在しないリソースへのアクセスは一律「見つかりません」（列挙攻撃対策、MVP設計書 §4-3 準拠）。

### 6-3. 監査ログ（最低限）

MVP では DB トリガーによる自動ログではなく、`record_comments.author_user_id` と `reading_records.created_by` で「誰が何をしたか」を追跡可能な状態を維持。将来的に `audit_log` テーブルへの拡張を残す。

---

## 7. 実装順序

| # | タスク | ファイル |
|---|--------|---------|
| 1 | マイグレーション作成 | `supabase/migrations/20260305000001_day3_comments.sql` |
| 2 | Zod スキーマ | `lib/validations/comment.ts` |
| 3 | DB クエリ層 | `lib/db/comments.ts` |
| 4 | Server Action | `app/actions/comment.ts` |
| 5 | 記録詳細ページにコメント UI 追加 | `app/records/[recordId]/page.tsx` |
| 6 | ビルド確認 → コミット & プッシュ | - |

---

## 8. 今回スコープ外（将来対応）

- コメント編集・削除 UI（DB の DELETE ポリシーは設定済み）
- 投稿者名表示（`profiles` テーブル追加が必要）
- コメント通知
- いいね機能
- E2E テスト自動化（テストフレームワーク未導入のため手動確認）
