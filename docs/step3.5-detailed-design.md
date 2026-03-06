# Step 3.5 詳細設計提案（UI/UX 改善・ジャンル機能）

対象: `docs/phase-plan-v2.md` の Step 3.5（3.5-1〜3.5-6）
作成日: 2026-03-06
前提: Step 1〜3 完了済み、Step 3 やり残し（メモ・読んだ日・ステータス）実装済み

---

## 1. 設計の目的

Step 3.5 は「記録を貯める」フェーズから「記録が意味を持つ」フェーズへの橋渡しを担う。

- **Step 4（AI レコメンド）の前提整備**: ジャンル情報なしでは、読書履歴ベースのレコメンドが機能しない
- **読書傾向の可視化**: 「図鑑しか読んでいない」「物語の記録がゼロ」を親子双方が自然に気づける
- **継続モチベーション強化**: ジャンル横断バッジで、物語など未挑戦ジャンルへの自然な誘導
- **子ども画面の魅力向上**: ホーム・スタンプ画面をより子どもが開きたくなるビジュアルに

---

## 2. スコープ

### In Scope
- 3.5-1 ジャンル選択（記録時）
- 3.5-2 ジャンル別本棚タブ（子ども）
- 3.5-3 ジャンル集計（親ダッシュボード）
- 3.5-4 ジャンル別バッジ
- 3.5-5 ホーム画面ビジュアル強化
- 3.5-6 スタンプ・バッジの演出強化

### Out of Scope（Step 4 以降）
- AI を使ったジャンル自動推定（Google Books の category を参照する案を含む）
- ジャンル別おすすめ（Step 5 の「親からのおすすめ送信」と連動予定）
- ポイント・カスタマイズ（Step 4-4）

---

## 3. ドメインモデル / DB 変更

### 3.1 ジャンル設計の方針

**`genre` カラムを `reading_records` テーブルに追加する**。

`books` テーブルへの追加も検討したが採用しない。理由:
- 同じ本（ISBN）を兄弟姉妹が「マンガ」「学習」と異なる認識で読む可能性がある
- Google Books の `categories` は日本語書籍で精度が低く、自動設定に頼れない
- ジャンルは「その子どもが読んだ文脈」の属性であり、書誌情報ではない

### 3.2 ジャンル定義

| 値 | 表示ラベル | 対象 |
|---|---|---|
| `story` | 📖 物語・小説 | 童話・児童文学・ライトノベル等 |
| `zukan` | 🔬 図鑑・科学 | 図鑑・科学読み物・伝記等 |
| `manga` | 🎭 マンガ | コミック全般（学習マンガ含む） |
| `picture_book` | 🖼️ 絵本・詩 | 絵本・詩集・なぞなぞ等 |
| `other` | 📚 その他 | 上記に当てはまらないもの |

> **選択肢の設計意図**: 「学習マンガ」を `manga` に含める（細分化より導線の明確さを優先）。
> 「物語」タブが空であることが子どもと親の双方に一目でわかることが重要。

### 3.3 DB マイグレーション

**Milestone A: `reading_records` への `genre` カラム追加**

```sql
-- (migration: 20260326000001_add_genre_to_reading_records.sql)
alter table public.reading_records
  add column genre text
    check (genre in ('story', 'zukan', 'manga', 'picture_book', 'other'));
```

既存レコードは `null`（未設定）となる。UI では未設定レコードを「すべて」タブにのみ表示する。

**Milestone B: バッジ定義の追加**

```sql
-- (migration: 20260326000002_add_genre_badges.sql)
insert into public.badges (id, name, description, icon, sort_order) values
  ('first_story',   'はじめての物語',    '物語や小説をはじめて読んだ！',      '📖', 10),
  ('three_genres',  '3ジャンル制覇！',   '3つのちがうジャンルの本を読んだ！', '🌈', 11),
  ('story_five',    '物語マスター',      '物語を5冊読んだ！',                 '✨', 12)
on conflict (id) do nothing;
```

### 3.4 RPC 変更一覧

| RPC | 変更内容 | 理由 |
|---|---|---|
| `create_kid_reading_record` | `target_genre text default null` を追加、INSERT に `genre` を含める | ジャンルを記録に保存するため |
| `get_kid_recent_records` | 返却カラムに `genre` を追加（シグネチャ変更なし → `CREATE OR REPLACE` で対応可） | 本棚タブのフィルタリングに使用 |
| `evaluate_kid_badges` | ジャンル別バッジの判定ロジックを追加 | 3.5-4 のバッジ付与のため |
| `get_kid_genre_breakdown` | 新規作成。child_id を受け取りジャンル別カウントを返す | 親ダッシュボードの集計表示 |

> **注**: `get_kid_recent_records` は返却カラムに `genre` を追加するだけで引数シグネチャは変わらないため、既存のGRANTはそのまま有効。

#### `get_kid_genre_breakdown` 設計

```sql
-- 新規 RPC（親ユーザー向け: service_role 経由で呼ぶ）
create or replace function public.get_kid_genre_breakdown(target_child_id uuid)
returns table (genre text, cnt bigint)
language sql security definer
as $$
  select
    coalesce(genre, 'unset') as genre,
    count(*) as cnt
  from public.reading_records
  where child_id = target_child_id
  group by genre;
$$;
```

---

## 4. UI 設計

### 4.1 ジャンル選択 UI（記録フォーム・3.5-1）

**子ども用 (`kid-record-form.tsx`)**

スタンプ選択の直後（現在はスタンプ → 気持ちタグ）に挿入する。

```
[ 📖 物語・小説 ] [ 🔬 図鑑・科学 ]
[ 🎭 マンガ     ] [ 🖼️ 絵本・詩   ]
[ 📚 その他    ]
```

- 2列グリッド（最後の「その他」は左寄せ）
- 選択時: `border-indigo-500 bg-indigo-50 text-indigo-700`（スタンプと色を変えて識別）
- 未選択時は任意（スタンプは必須だがジャンルは任意にする）

**親用 (`app/children/[childId]/records/new/page.tsx`)**

ステータス選択の直後に同様のジャンル選択を追加。ラベルは日本語（ひらがな不要）。

### 4.2 ジャンル別本棚タブ（子ども・3.5-2）

`/kids/records` に「すべて」を先頭としたタブを追加する。

```
[ すべて(12) ] [ 📖 物語(0) ] [ 🔬 図鑑(8) ] [ 🎭 マンガ(3) ] [ 🖼️ 絵本(1) ] [ 📚 その他(0) ]
```

- タブは水平スクロール可（`overflow-x-auto flex gap-2`）
- 選択タブ: `bg-amber-700 text-white`（既存の棚デザインと統一）
- **「物語(0)」タブ選択時の空状態**: 通常の「まだ記録がありません」ではなく専用メッセージ
  ```
  📖 まだ物語は読んでいないよ
  どんな物語があるか、おうちの人に聞いてみよう！
  ```
- ジャンル未設定レコードは「すべて」にのみ表示（タブ分類には含めない）

### 4.3 親ダッシュボードのジャンル集計（3.5-3）

`/children/[childId]` の本棚ビジュアルセクションの下に追加。

**表示案（シンプルなインライン棒グラフ）**:

```
ジャンル内訳
📖 物語     ━━━━━━━━━━━━━━━  0 冊
🔬 図鑑     ████████████████ 8 冊
🎭 マンガ   ████████         3 冊
🖼️ 絵本     ████             1 冊
```

- 棒グラフは最大幅を `max-w-xs` 程度に抑え、カラム全幅は使わない
- 「物語 0 冊」の行には `text-amber-600 font-semibold` で控えめに強調
- 実装: CSS の `width` を `{count / max * 100}%` で動的に設定。グラフライブラリ不要

### 4.4 ジャンル別バッジ（3.5-4）

`evaluate_kid_badges` に以下の判定を追加:

| バッジ | 判定条件 |
|---|---|
| `first_story` | `story` ジャンルの記録が 1 件以上 |
| `three_genres` | `genre is not null` の記録で、`distinct genre` が 3 種類以上 |
| `story_five` | `story` ジャンルの記録が 5 件以上 |

`first_story` は「物語を一度も読んだことがない子どもが初めて読んだとき」に発火するため、最も重要なバッジ。

### 4.5 ホーム画面ビジュアル強化（3.5-5）

`/kids/home` のナビゲーション部分を4ボタン並びからカードグリッドに変更。

**現状**（テキストボタン4つ）:
```
[きょうの記録をつける] [本だなを見る] [カレンダーを見る] [メッセージ(3)]
```

**改善案**（2×2 カードグリッド）:
```
┌───────────────┬───────────────┐
│  ✏️            │  📚           │
│ きょうの記録   │  本だなを見る  │
│  をつける      │               │
├───────────────┼───────────────┤
│  📅           │  💌           │
│  カレンダー    │  メッセージ    │
│               │  ★ 3件未読    │
└───────────────┴───────────────┘
```

- 各カード: `rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm`
- 絵文字は `text-4xl` で大きく表示
- 未読メッセージカードは `bg-rose-50 border-rose-200`（通常と色を変える）
- 未読数は角バッジ (`absolute top-2 right-2 rounded-full bg-rose-500 text-white text-xs`) で表示

### 4.6 スタンプ・バッジの演出強化（3.5-6）

**スタンプ選択のビジュアル改善**

現状は小さなボタン（`text-sm`）のため、選択体験が薄い。

```
┌─────────────────┬─────────────────┐
│      🌟         │      😊         │
│  すごくよかった  │  たのしかった    │
├─────────────────┼─────────────────┤
│      😐         │      😓         │
│    ふつう        │  むずかしかった  │
└─────────────────┴─────────────────┘
```

- 絵文字: `text-3xl` → タップ対象が大きくなる
- ボタン高さ: `py-4`（現状 `py-2`）
- 選択時: `scale-105` トランジション（`transition-transform`）

**バッジ獲得演出**

バッジ獲得後のリダイレクト先を `/kids/home` から `/kids/records/new/badge?id=first_story` のような中間ページに変更することも検討したが、実装コストが高い。

より軽量な案として:
- バッジ獲得情報を `redirect` の前に Cookie に一時保存
- `/kids/home` のクライアントコンポーネントが Cookie を読み取り、あれば演出を表示して削除
- 演出: Tailwind の `animate-bounce` + `animate-ping` の組み合わせ（外部ライブラリ不要）

```tsx
// 演出の概要（実装時に詳細化）
{newBadge && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl animate-bounce">
      <p className="text-5xl">{newBadge.icon}</p>
      <p className="mt-2 text-xl font-bold">{newBadge.name}</p>
      <p className="mt-1 text-sm text-slate-600">{newBadge.description}</p>
    </div>
  </div>
)}
```

---

## 5. データフロー（ジャンル機能）

```
子ども記録フォーム
  ↓ genre 選択（任意）
createKidRecord (Server Action)
  ↓ target_genre を渡す
create_kid_reading_record (RPC)
  ↓ reading_records.genre に保存
  ↓
evaluate_kid_badges (RPC)
  ↓ first_story / three_genres / story_five を判定・付与

親ダッシュボード
  ↓ get_kid_genre_breakdown (RPC)
  ↓ ジャンル別カウントを取得
  → 棒グラフ表示

子ども本棚 (/kids/records)
  ↓ get_kid_recent_records (改訂版、genre を含む)
  ↓ genre でクライアントフィルタリング
  → タブ別の本棚表示
```

---

## 6. 権限・RLS

### 子どもセッション（`child_session` ロール）

- `genre` カラムの追加は `reading_records` テーブルへの ALTER のみで、RLS ポリシー自体の変更は不要
- `create_kid_reading_record` RPC の GRANT は新シグネチャで付け直し（Milestone A マイグレーションで対応）
- `get_kid_genre_breakdown` は**親専用**のため `child_session` には GRANT しない（`service_role` のみ）

### 親ユーザー（Supabase Auth JWT）

- `getRecordsForChild` の select 文に `genre` を追加するだけで対応可（RLS 変更なし）

---

## 7. 実装マイルストーン

### Milestone A: DB 基盤（先行着手推奨）
- `20260326000001`: `reading_records.genre` カラム追加
- `20260326000002`: ジャンル別バッジ定義の INSERT
- `create_kid_reading_record` RPC に `target_genre` を追加（既存マイグレーションと同ファイルは避け、新規ファイルで DROP & RECREATE）
- `get_kid_recent_records` に `genre` 返却カラムを追加
- `get_kid_genre_breakdown` RPC を新規作成

### Milestone B: 記録フォームのジャンル選択 UI
- `kid-record-form.tsx` にジャンル選択 fieldset を追加
- `app/actions/kid-record.ts` に `genre` パラメータを追加
- `app/children/[childId]/records/new/page.tsx` にジャンル選択を追加
- `app/actions/record.ts`（親側アクション）に `genre` を追加

### Milestone C: ジャンル表示 UI
- `app/kids/records/page.tsx` にタブ切り替えを追加（クライアントコンポーネント化が必要）
- `app/children/[childId]/page.tsx` にジャンル集計グラフを追加
- `lib/db/records.ts` の `getRecordsForChild` に `genre` を追加

### Milestone D: ジャンル別バッジ
- `supabase/migrations` で `evaluate_kid_badges` RPC を更新
- `lib/kids/badges.ts` の `ChildBadgeRow` 型に変更があれば追随

### Milestone E: ビジュアル強化
- `app/kids/home/page.tsx` ホームカードグリッド
- `components/kid-record-form.tsx` スタンプボタンの大型化
- バッジ獲得演出（Cookie 経由の一時フラグ + ホーム画面でのモーダル表示）

> **実装順の根拠**: Milestone A は他すべての前提のため最優先。Milestone B・C は並行可。E はいつでも着手可能だが、Milestone A〜D が揃ってから実施するとテストが楽。

---

## 8. 未決定事項・要確認

| 項目 | 内容 | 推奨 |
|---|---|---|
| ジャンル選択の必須/任意 | 子ども記録でジャンルを必須にするか | **任意**（記録のハードルを上げない。未設定はタブ集計から除外） |
| 既存レコードのジャンル | `NULL` レコードをどう扱うか | 「すべて」タブにのみ表示。将来的に親が後から設定できるようにする案も |
| 本棚タブの実装方式 | サーバーレンダリング vs クライアントフィルタ | `get_kid_recent_records` が全件返すため、**クライアントフィルタ**が現実的（`max_rows=120` は既存通り） |
| バッジ演出の技術 | Cookie 方式 vs URL クエリパラメータ方式 | URLパラメータ方式の方がシンプルで確実。`/kids/home?badge=first_story` にリダイレクト |
| ジャンル集計グラフのデザイン | CSS のみ vs chart ライブラリ | CSS のみ（`recharts` 等は導入コストが不釣り合い） |

---

## 9. Step 4/5 への接続ポイント

- `reading_records.genre` は Step 4-2（AI レコメンド）の特徴量として直接使用可能
- 「物語 0 冊」の検出ロジックは Step 5-2（親からのおすすめ送信）で「物語をすすめる」フィルタとして活用可能
- ジャンル別バッジは Step 4-4（読書ポイント）のジャンル挑戦ボーナスに拡張できる

---

## 10. 受け入れ基準（Step 3.5 完了条件）

- [ ] 子ども記録フォームでジャンルを任意で選択できる
- [ ] 親記録フォームでもジャンルを選択できる
- [ ] 子どもの本棚にジャンルタブが表示され、タブ切り替えで絞り込める
- [ ] 「物語」タブが空のとき専用の空状態メッセージが表示される
- [ ] 親の子ども詳細ページにジャンル別棒グラフが表示される
- [ ] ジャンル別バッジ（`first_story`・`three_genres`・`story_five`）が付与される
- [ ] ホーム画面がカードグリッドレイアウトになっている
- [ ] スタンプボタンが大きくなっている
- [ ] `npm run lint` / `npm run build` が通る
