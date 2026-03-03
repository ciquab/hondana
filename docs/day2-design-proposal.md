# ほんだな Day2 設計提案 — 読書記録 CRUD

## 0. Day2 のゴール（完了条件の再確認）

> 親が任意の子どもに対して読書記録を作成/閲覧できる。別家族のデータにアクセス不可。

具体的には以下がすべて通ること:

1. ダッシュボードで子どもをタップ → その子の読書記録一覧が見える
2. 「記録を追加」→ 本の情報（タイトル必須）＋ステータスを入力 → 保存
3. 一覧から記録をタップ → 詳細（メモ・ステータス・読了日）が見える
4. ステータスを変更できる（`want_to_read` → `reading` → `finished`）
5. RLS により別家族の子ども/記録には一切アクセスできない

---

## 1. 事前に決定が必要な設計判断

### 1-1. `books` テーブルのスコープ

| 選択肢 | メリット | デメリット |
|---|---|---|
| **A. グローバル共有テーブル（推奨）** | 同じ ISBN/タイトルの本が重複しない。将来の書誌 API 連携と相性が良い | 他家族の insert した本が見える（タイトルのみ、記録は見えない） |
| B. 家族ごとに本を持つ（`family_id` 付き） | 完全に家族内閉鎖 | 同じ本が家族数だけ重複。将来の検索・統計が煩雑 |

**提案: A** — `books` は共有リソース（図書館のカタログ相当）とし、`reading_records` で家族境界を守る。
`isbn13` の UNIQUE 制約はそのまま維持するが、NULL は許容（ISBN なしの手動登録のため）。

### 1-2. 記録入力項目の必須/任意

| フィールド | 提案 | 理由 |
|---|---|---|
| 本のタイトル | **必須** | 記録として最低限必要 |
| 著者 | 任意 | 絵本は著者を知らないまま登録するケースが多い |
| ISBN | 任意 | MVPでは手動入力が主。バーコード連携は Day2 スコープ外 |
| ステータス | **必須**（デフォルト `want_to_read`） | ステータスなしの記録は意味が薄い |
| メモ | 任意 | 親の代理入力なので子どもの感想はあとから追加 |
| 読了日 | 任意（`status = finished` 時のみ UI 表示） | `finished` 以外で日付を求めると混乱する |

### 1-3. バーコード/ISBN 入力の扱い

**提案: Day2 では完全にスコープ外**。フォームに ISBN テキスト入力欄は設けるが、カメラ連携や API 検索は行わない。ISBN が入力された場合は `books.isbn13` に保存するのみ。

### 1-4. 子どもの人数上限

**提案: MVP では制限なし（UI は最大 10 人程度を想定）**。ダッシュボードの子ども一覧はシンプルなリスト表示で十分。セレクタ UI が必要になるのは子ども切り替え時だが、Day2 では URL パスで子どもを指定するため問題ない。

---

## 2. データベース設計

### 2-1. 新規テーブル

```sql
-- books: グローバル共有の書籍カタログ
create table public.books (
  id          uuid primary key default gen_random_uuid(),
  isbn13      text unique,              -- NULL許容（手動登録用）
  title       text not null,
  author      text,
  cover_url   text,
  created_at  timestamptz not null default now()
);

-- reading_records: 家族×子ども単位の読書記録
create table public.reading_records (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families on delete cascade,
  child_id    uuid not null references public.children on delete cascade,
  book_id     uuid not null references public.books on delete cascade,
  status      text not null default 'want_to_read'
              check (status in ('want_to_read', 'reading', 'finished')),
  memo        text,
  finished_on date,
  created_by  uuid not null,            -- 親の auth.users.id
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### 2-2. インデックス

```sql
create index idx_reading_records_family_child
  on public.reading_records (family_id, child_id, created_at desc);

create index idx_reading_records_book
  on public.reading_records (book_id);

create index idx_books_isbn13
  on public.books (isbn13) where isbn13 is not null;
```

### 2-3. updated_at 自動更新トリガー

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_reading_records_updated_at
  before update on public.reading_records
  for each row execute function public.set_updated_at();
```

### 2-4. RLS ポリシー

```sql
-- books: 誰でも読める / 認証ユーザーなら作成可
alter table public.books enable row level security;

create policy "Anyone can read books"
  on public.books for select using (true);

create policy "Authenticated users can insert books"
  on public.books for insert
  with check (auth.uid() is not null);

-- reading_records: 家族メンバーのみ CRUD
alter table public.reading_records enable row level security;

create policy "Family members can view records"
  on public.reading_records for select
  using (public.is_family_member(family_id));

create policy "Family members can create records"
  on public.reading_records for insert
  with check (
    public.is_family_member(family_id)
    and created_by = auth.uid()
  );

create policy "Family members can update own records"
  on public.reading_records for update
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy "Family members can delete own records"
  on public.reading_records for delete
  using (
    public.is_family_member(family_id)
    and created_by = auth.uid()
  );
```

### 2-5. 子ども所属チェック用 RPC（IDOR 防止）

```sql
-- 指定の child が現在ユーザーの家族に所属しているか確認
create or replace function public.is_child_in_my_family(target_child_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.children c
    join public.family_members fm on fm.family_id = c.family_id
    where c.id = target_child_id
      and fm.user_id = auth.uid()
  );
$$;
```

---

## 3. ルーティング & ページ構成

```
app/
  dashboard/page.tsx                         # 既存 — 子ども一覧（リンク追加）
  children/[childId]/
    page.tsx                                 # 子どもの読書記録一覧
    records/
      new/page.tsx                           # 読書記録の新規作成
  records/[recordId]/
    page.tsx                                 # 記録詳細 & ステータス更新
```

### 各ページの責務

| ページ | レンダリング | 主な機能 |
|---|---|---|
| `/dashboard` | Server | 子ども一覧。各子どもに `/children/[childId]` へのリンクを追加 |
| `/children/[childId]` | Server | 子どもの読書記録一覧（ステータスでグループ化）。「記録を追加」ボタン |
| `/children/[childId]/records/new` | Client | 本の情報入力 + ステータス選択 → `createRecord` Server Action |
| `/records/[recordId]` | Server + Client | 記録詳細表示。ステータス変更は `updateRecordStatus` Server Action |

---

## 4. Server Actions 設計

### 4-1. `createRecord`

```typescript
// app/actions/record.ts
export async function createRecord(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult>
```

**処理フロー:**
1. FormData から `childId`, `title`, `author`, `isbn`, `status`, `memo` を取得
2. Zod でバリデーション
3. `childId` が自分の家族に属するか確認（`is_child_in_my_family` RPC）
4. `books` テーブルに upsert（ISBN があれば既存を返す、なければ insert）
5. `reading_records` に insert
6. `revalidatePath` → redirect

**Zod スキーマ:**
```typescript
const createRecordSchema = z.object({
  childId: z.string().uuid(),
  title: z.string().min(1, '本のタイトルを入力してください').max(200),
  author: z.string().max(200).optional(),
  isbn: z.string().regex(/^\d{13}$/, 'ISBN は13桁の数字です').optional().or(z.literal('')),
  status: z.enum(['want_to_read', 'reading', 'finished']),
  memo: z.string().max(2000).optional(),
  finishedOn: z.string().date().optional().or(z.literal('')),
});
```

### 4-2. `updateRecordStatus`

```typescript
export async function updateRecordStatus(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult>
```

**処理フロー:**
1. `recordId`, `status`, `memo`, `finishedOn` を取得
2. Zod バリデーション
3. 既存 record を取得 → `family_id` で家族所属確認
4. `reading_records` を update
5. `revalidatePath`

---

## 5. DB クエリ層

```typescript
// lib/db/records.ts

// 子どもの読書記録一覧（本の情報を JOIN）
export async function getRecordsForChild(childId: string)

// 記録の詳細（本の情報を JOIN）
export async function getRecordDetail(recordId: string)

// 既存の本を ISBN で検索（将来の重複防止用）
export async function findBookByIsbn(isbn: string)
```

すべてのクエリで RLS が効くため、`family_id` の手動フィルタは不要。ただし `childId` の URL パラメータ改竄に対しては Server Action 側で `is_child_in_my_family` チェックを入れる。

---

## 6. UI 設計メモ

### 6-1. ダッシュボード変更

現在の子ども一覧の各項目に以下を追加:
- 読書記録の件数バッジ（例:「📚 5冊」）
- タップで `/children/[childId]` へ遷移

### 6-2. 子ども記録一覧 (`/children/[childId]`)

- ヘッダー: 子どもの名前 + 「記録を追加」ボタン
- ステータスごとにセクション分け:
  - 「読みたい」(`want_to_read`)
  - 「読書中」(`reading`)
  - 「読了」(`finished`)
- 各記録カード: 本のタイトル、著者、登録日

### 6-3. 記録作成フォーム (`/children/[childId]/records/new`)

```
[本のタイトル]  ← 必須
[著者]          ← 任意
[ISBN]          ← 任意、13桁数字
[ステータス]    ← セレクトボックス（デフォルト: 読みたい）
[メモ]          ← textarea、任意
[読了日]        ← status=finished 時のみ表示
[追加する] ボタン
```

### 6-4. 記録詳細 (`/records/[recordId]`)

- 本の情報表示
- ステータス変更ボタン群（現在ステータスをハイライト）
- メモ表示・編集
- 読了日（finished 時のみ表示・編集）

---

## 7. セキュリティチェックリスト（Day2 完了時に全件確認）

- [ ] `reading_records` に RLS が有効で、`is_family_member` ベースのポリシーが全 CRUD に設定されている
- [ ] `books` の RLS: `select` は全員可、`insert` は認証ユーザーのみ
- [ ] Server Action `createRecord` で `childId` の家族所属チェックを行っている
- [ ] Server Action `updateRecordStatus` で `recordId` の家族所属チェックを行っている
- [ ] URL パラメータの `childId` / `recordId` を UUID バリデーションしている
- [ ] エラーメッセージに「その記録は存在しません」と「権限がありません」を区別して返していない
- [ ] `created_by` は Server Action 内で `auth.uid()` から設定し、クライアントから送信させていない
- [ ] `family_id` は Server Action 内で DB から解決し、クライアントから送信させていない

---

## 8. ファイル作成・変更の一覧（実装計画）

### 新規作成
| ファイル | 内容 |
|---|---|
| `supabase/migrations/20260303_000004_day2_books_records.sql` | books, reading_records テーブル + RLS + トリガー |
| `lib/validations/record.ts` | Zod スキーマ定義 |
| `lib/db/records.ts` | DB クエリ関数 |
| `app/actions/record.ts` | `createRecord`, `updateRecordStatus` Server Actions |
| `app/children/[childId]/page.tsx` | 子どもの記録一覧ページ |
| `app/children/[childId]/records/new/page.tsx` | 記録作成フォーム |
| `app/records/[recordId]/page.tsx` | 記録詳細ページ |

### 変更
| ファイル | 変更内容 |
|---|---|
| `app/dashboard/page.tsx` | 子ども一覧に記録件数バッジ + リンク追加 |
| `middleware.ts` | `/children`, `/records` を保護ルートに追加 |
| `package.json` | `zod` 依存追加 |

---

## 9. Day2 着手前の別途対応（GitHub 外）

| 対応 | 手順 |
|---|---|
| Supabase CLI セットアップ | `npm i -D supabase` → `npx supabase init` → `npx supabase link --project-ref <ref>` |
| 既存マイグレーションの適用確認 | `npx supabase db push` で Day1 の3マイグレーション + RPC が適用済みか確認 |
| `zod` インストール | `npm install zod` |
| `.env.local` の確認 | `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されていること |
| Supabase 型生成 | `npx supabase gen types typescript --linked > lib/db/types.ts`（Day2 マイグレーション適用後に再実行） |
