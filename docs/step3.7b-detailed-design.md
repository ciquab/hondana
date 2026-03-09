# Step 3.7b 詳細設計: 初回体験 & フォーム改善

作成日: 2026-03-09
前提: Step 3.7 完了済み。Step 3.8（ミッション・ダッシュボード強化）の前に実施。
参照: [5パターンペルソナ評価](./persona-ux-evaluation-5patterns-2026-03-09.md)

---

## 目的

Step 3.8 のミッション機能は「すでに記録できるユーザー」に効果を発揮する。
しかしペルソナ評価で、以下の層が **記録に到達できない** ことが判明した:

1. **超低年齢（6歳）**: フォームが長すぎて保存まで辿り着けない
2. **読書習慣ゼロ（8歳）**: 空画面で「何をすればいいか」分からず離脱
3. **きょうだいの下の子（小1）**: 姉のマネをしたいが操作で詰まる

3.7b はこの **「記録の入口の壁」** を取り除き、3.8 の効果を最大化するための前提整備。

---

## 3.7b-1: 空状態の CTA 強化

### 現状の問題

各画面の空状態は「テキストのみ」で、次アクションへの導線がない:

| 画面 | 現状テキスト | 問題 |
|------|-------------|------|
| ホーム（さいきんよんだほん） | `まだきろくがありません。` | 何をすれば表示されるか分からない |
| ホーム（バッジ） | `まだバッジはありません。` | バッジ獲得方法が不明 |
| 本棚（全体） | `まだ どくしょきろくが ありません。まずは「きょうのきろくをつける」からはじめよう！` | テキストのみで遷移ボタンなし |
| 本棚（ジャンル別） | 各ジャンルのメッセージ | 次アクション導線なし |
| カレンダー（バッジ） | `まだばっじはありません。きろくしてみよう！` | 遷移先が不明 |
| メッセージ | `まだメッセージはありません。おうちのひとのこめんとやリアクションがでます。` | 子どもにできることが不明 |

### 設計方針

- テキストだけの空状態を **イラスト的絵文字 + メッセージ + CTAボタン** に統一
- CTAボタンは `/kids/records/new` への遷移を基本とする（読書記録が全ての起点）
- 文言は子ども向け辞書基準（ひらがな中心）に準拠
- ボタンは既存の FAB と同系色（`bg-orange-500`）で統一感を持たせる

### 画面別の変更

#### 1. ホーム画面: さいきんよんだほん（空状態）

**対象**: `app/kids/home/page.tsx` L239-291 の `recentRows.length === 0` 分岐

**Before:**
```tsx
<p className="text-sm text-slate-600">まだきろくがありません。</p>
```

**After:**
```tsx
<div className="flex flex-col items-center py-6 text-center">
  <span className="text-4xl">📚</span>
  <p className="mt-2 font-semibold text-slate-700">
    まだ きろくが ないよ
  </p>
  <p className="mt-1 text-sm text-slate-500">
    ほんをよんだら きろくしてみよう！
  </p>
  <a
    href="/kids/records/new"
    className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
  >
    📖 きろくをつける
  </a>
</div>
```

#### 2. ホーム画面: バッジ（空状態）

**対象**: `app/kids/home/page.tsx` L211-226 の `badges.length === 0` 分岐

**Before:**
```tsx
<p className="text-sm text-slate-600">まだバッジはありません。</p>
```

**After:**
```tsx
<div className="flex flex-col items-center py-4 text-center">
  <span className="text-4xl">🏅</span>
  <p className="mt-2 font-semibold text-slate-700">
    まだ バッジは ないよ
  </p>
  <p className="mt-1 text-sm text-slate-500">
    1さつ きろくすると はじめてのバッジが もらえるよ！
  </p>
</div>
```

> バッジ空状態には記録へのCTAボタンを置かない（上のセクションに既にあるため重複を避ける）。
> 代わりに「1冊記録するとバッジ獲得」のヒントを明示する。

#### 3. 本棚: 全体空状態

**対象**: `components/kids-bookshelf.tsx` L128-132

**Before:**
```tsx
<p className="rounded bg-white/80 p-5 text-sm text-slate-700">
  まだ どくしょきろくが ありません。まずは「きょうのきろくをつける」からはじめよう！
</p>
```

**After:**
```tsx
<div className="flex flex-col items-center rounded-xl bg-white/80 py-8 text-center shadow">
  <span className="text-5xl">📚</span>
  <p className="mt-3 text-lg font-bold text-slate-700">
    ほんだなは まだ からっぽ
  </p>
  <p className="mt-1 text-sm text-slate-500">
    ほんをよんだら きろくして、ほんだなを いっぱいにしよう！
  </p>
  <a
    href="/kids/records/new"
    className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-5 py-2.5 text-base font-bold text-white shadow hover:bg-orange-600"
  >
    📖 さいしょの1さつを きろくする
  </a>
</div>
```

#### 4. 本棚: ジャンル別空状態

**対象**: `components/kids-bookshelf.tsx` L133-149（`GENRE_EMPTY_MESSAGES` 使用箇所）

**変更方針**: 既存の `GENRE_EMPTY_MESSAGES` 構造にCTAリンクを追加。

**Before:**
```tsx
// GENRE_EMPTY_MESSAGES は emoji, message, sub のみ
<p className="text-3xl">{msg.emoji}</p>
<p className="mt-2 font-semibold">{msg.message}</p>
<p className="mt-1 text-sm text-slate-500">{msg.sub}</p>
```

**After:**
```tsx
// GENRE_EMPTY_MESSAGES に cta フィールドを追加
type GenreEmptyMessage = {
  emoji: string;
  message: string;
  sub: string;
  cta: string;  // ← 追加
};

// 各ジャンルに cta を設定:
// story:        'ものがたりを よんでみよう！'
// zukan:        'ずかんを さがしてみよう！'
// manga:        'まんがを よんでみよう！'
// picture_book: 'えほんを よんでみよう！'
// other:        'いろんなほんを よんでみよう！'

// UI に CTA ボタンを追加
<p className="text-3xl">{msg.emoji}</p>
<p className="mt-2 font-semibold">{msg.message}</p>
<p className="mt-1 text-sm text-slate-500">{msg.sub}</p>
<a
  href="/kids/records/new"
  className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
>
  📖 きろくをつける
</a>
```

#### 5. カレンダー: バッジ空状態

**対象**: `app/kids/calendar/page.tsx` L165-184

**Before:**
```tsx
<p className="text-sm text-slate-600">
  まだばっじはありません。きろくしてみよう！
</p>
```

**After:**
```tsx
<div className="flex flex-col items-center py-4 text-center">
  <span className="text-3xl">🏅</span>
  <p className="mt-2 text-sm text-slate-600">
    まだ バッジは ないよ
  </p>
  <p className="mt-1 text-xs text-slate-400">
    きろくすると バッジが もらえるよ！
  </p>
</div>
```

#### 6. メッセージ: 空状態

**対象**: `app/kids/messages/page.tsx` L37-40

**Before:**
```tsx
<p className="rounded bg-white p-4 text-sm text-slate-600 shadow">
  まだメッセージはありません。おうちのひとのこめんとやリアクションがでます。
</p>
```

**After:**
```tsx
<div className="flex flex-col items-center rounded-xl bg-white py-8 text-center shadow">
  <span className="text-4xl">💬</span>
  <p className="mt-2 font-semibold text-slate-700">
    まだ メッセージは ないよ
  </p>
  <p className="mt-1 text-sm text-slate-500">
    ほんをよんで きろくすると、おうちのひとから<br />
    メッセージが とどくかも！
  </p>
  <a
    href="/kids/records/new"
    className="mt-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
  >
    📖 きろくをつける
  </a>
</div>
```

### 受け入れ条件

- [ ] 6画面の空状態すべてが「絵文字 + メッセージ + ヒントテキスト」構成に統一されている
- [ ] 本棚全体・ホーム記録・メッセージ・本棚ジャンル別の空状態にCTAボタンがあり、`/kids/records/new` に遷移できる
- [ ] バッジ空状態はCTAボタンなし（重複回避）で、獲得方法のヒントが表示される
- [ ] 文言がひらがな中心で、子ども向け辞書基準に準拠している
- [ ] 既存のレイアウト・色調と調和している

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `app/kids/home/page.tsx` | 記録空状態・バッジ空状態のUI変更 |
| `components/kids-bookshelf.tsx` | 全体空状態・ジャンル別空状態のUI変更、`GENRE_EMPTY_MESSAGES` 型拡張 |
| `app/kids/calendar/page.tsx` | バッジ空状態のUI変更 |
| `app/kids/messages/page.tsx` | メッセージ空状態のUI変更 |

### 工数見積もり

**小**（各画面のテキスト置換 + 軽微なマークアップ追加のみ。ロジック変更なし）

---

## 3.7b-2: 記録フォーム「かんたんモード」

### 現状の問題

記録フォーム（`components/kid-record-form.tsx`）は以下の13セクションで構成されている:

```
1. バーコードスキャン
2. タイトル検索
3. 検索結果一覧
4. 表紙画像
5. ほんのタイトル（必須）
6. かいたひと
7. ISBN
8. スタンプ（必須）
9. ジャンル
10. きもちタグ（12個）
11. さいごまでよんだ？
12. よんだひ
13. ひとことかんそう
+ 保存ボタン
```

**問題点:**
- 6歳がスクロールして全項目を埋めるのは困難（P1）
- 読書嫌いの8歳には「やらされ感」が強すぎる（P4）
- 本当に必須なのは **タイトル + スタンプ** のみ（バリデーション上）

### 設計方針

- フォーム冒頭に「かんたん / くわしく」のモード切替を設置
- **かんたんモード**: タイトル検索（バーコード含む）＋ スタンプ のみ
- **くわしくモード**: 現行フォーム（全項目表示）
- デフォルトは **かんたんモード**（初回ユーザーを優先）
- モード選択は **クライアント state** で管理（`useState`、サーバーアクション変更なし）
- かんたんモードで省略された項目は **デフォルト値** で保存:
  - `author`: 空（検索で取得済みなら自動セット）
  - `isbn`: 空（検索で取得済みなら自動セット）
  - `genre`: 未選択（null）
  - `feelingTags`: 空配列
  - `status`: `finished`（さいごまでよんだ）
  - `finishedOn`: 今日の日付
  - `memo`: 空

### UI設計

#### モード切替ボタン

フォーム最上部（バーコードボタンの直上）に配置:

```
┌─────────────────────────────────┐
│                                 │
│  ── きろくモード ──             │
│                                 │
│  [✨ かんたん]  [📝 くわしく]    │  ← セグメントコントロール
│                                 │
│  ── かんたんモードの場合 ──     │
│                                 │
│  📷 バーコードでとうろく         │
│                                 │
│  🔍 なまえでけんさく             │
│  [________________] [けんさく]   │
│                                 │
│  検索結果 / 表紙画像             │
│                                 │
│  ほんのタイトル                  │
│  [________________]              │
│                                 │
│  スタンプをえらぶ                │
│  🌟  😊  😐  😓                │
│                                 │
│  [🧡 ほぞんする]                 │
│                                 │
└─────────────────────────────────┘
```

#### セグメントコントロール実装

```tsx
type RecordMode = 'simple' | 'detailed';

const [mode, setMode] = useState<RecordMode>('simple');

// UI
<div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
  <button
    type="button"
    onClick={() => setMode('simple')}
    className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition-colors ${
      mode === 'simple'
        ? 'bg-white text-orange-600 shadow'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    ✨ かんたん
  </button>
  <button
    type="button"
    onClick={() => setMode('detailed')}
    className={`flex-1 rounded-md px-3 py-2 text-sm font-bold transition-colors ${
      mode === 'detailed'
        ? 'bg-white text-orange-600 shadow'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    📝 くわしく
  </button>
</div>
```

#### フィールド表示制御

```tsx
// 「かんたん」モードでは以下を非表示:
{mode === 'detailed' && (
  <>
    {/* かいたひと */}
    {/* ISBN */}
    {/* ジャンル */}
    {/* きもちタグ */}
    {/* さいごまでよんだ？ */}
    {/* よんだひ */}
    {/* ひとことかんそう */}
  </>
)}
```

hidden フィールドでデフォルト値を設定:

```tsx
{mode === 'simple' && (
  <>
    <input type="hidden" name="status" value="finished" />
    <input type="hidden" name="finishedOn" value={today} />
  </>
)}
```

> **注**: 表紙画像・著者・ISBN は検索やバーコードスキャンで自動取得された場合は hidden フィールドとして残る（既存ロジックで `coverUrl`, `author`, `isbn` がセットされる）。かんたんモードでも書誌情報は失われない。

### サーバーアクション変更

**変更なし**。

- `createKidRecord()` は現状でも `author`, `isbn`, `genre`, `memo` を optional として受け付ける
- `status` と `stamp` は必須だが、かんたんモードでも両方送信される
- `finishedOn` はデフォルト値で送信
- バリデーションスキーマ（`createKidRecordSchema`）の変更不要

### 保存後の「くわしく きろくする？」導線

かんたんモードで保存した場合、リダイレクト先（現在は `/kids/home`）で以下の情報を表示する案もあるが、3.8-5（記録完了画面）で統合的に対応するため **3.7b では対応しない**。

### 受け入れ条件

- [ ] フォーム冒頭に「✨ かんたん / 📝 くわしく」のセグメントコントロールが表示される
- [ ] デフォルトは「かんたん」モード
- [ ] かんたんモードでは、タイトル検索（バーコード含む）+ スタンプ + 保存ボタン のみ表示される
- [ ] かんたんモードでもバーコードスキャン/検索で取得した書誌情報（著者・ISBN・表紙）は hidden で送信される
- [ ] かんたんモードの省略項目はデフォルト値（`status=finished`, `finishedOn=今日`）で保存される
- [ ] くわしくモードは現行フォームと完全に同一（既存機能のリグレッションなし）
- [ ] モード切替はクライアント state のみ（サーバーアクション・バリデーション変更なし）
- [ ] 切替時に入力済みデータは保持される（かんたん→くわしくに切り替えても、タイトルやスタンプは消えない）

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `components/kid-record-form.tsx` | モード切替state追加、条件付きレンダリング、hidden フィールド追加 |

### 工数見積もり

**中**（UIの条件分岐追加。ロジック・バリデーション変更なし。テスト時にかんたん/くわしく両モードの保存確認が必要）

---

## 3.7b-3: 検索0件時のリカバリ UI

### 現状の問題

**対象**: `components/kid-record-form.tsx` L191-193

```tsx
// 現状: テキストのみ
<p className="mt-2 text-sm text-slate-500">
  みつかりませんでした。したのフォームでにゅうりょくできます。
</p>
```

**問題点:**
- 「したのフォーム」がどこか分からない（スクロールが必要）
- リカバリ手段が1つ（手入力）しか提示されない
- 検索クエリが間違っていた場合の再試行導線がない

### 設計方針

- テキスト表示を **3ボタンのリカバリカード** に置き換える
- 「もういちどけんさく」「バーコードでしらべる」「じぶんでにゅうりょく」の3つの明確な次アクションを提示
- 「じぶんでにゅうりょく」はフォーム下部（タイトル入力フィールド）への自動スクロール

### UI設計

```
┌────────────────────────────────────┐
│                                    │
│  😕 みつからなかったよ              │
│                                    │
│  ちがう なまえで ためしてみたり、   │
│  バーコードを よんだり してみよう   │
│                                    │
│  [🔍 もういちど けんさく]           │
│  [📷 バーコードで しらべる]          │
│  [✏️ じぶんで にゅうりょく]          │
│                                    │
└────────────────────────────────────┘
```

### 実装詳細

```tsx
{hasSearched && !searching && searchResults.length === 0 && (
  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
    <p className="text-2xl">😕</p>
    <p className="mt-1 font-semibold text-slate-700">
      みつからなかったよ
    </p>
    <p className="mt-1 text-sm text-slate-500">
      ちがう なまえで ためしてみたり、
      バーコードを よんだり してみよう
    </p>
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setSearchQuery('');
          setSearchResults([]);
          setHasSearched(false);
          searchInputRef.current?.focus();
        }}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        🔍 もういちど けんさく
      </button>
      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        📷 バーコードで しらべる
      </button>
      <button
        type="button"
        onClick={() => {
          setHasSearched(false);
          titleInputRef.current?.focus();
          titleInputRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        ✏️ じぶんで にゅうりょく
      </button>
    </div>
  </div>
)}
```

### 必要な追加state/ref

```tsx
// 検索入力へのref（「もういちど検索」でフォーカス用）
const searchInputRef = useRef<HTMLInputElement>(null);

// タイトル入力へのref（「じぶんで入力」でスクロール＋フォーカス用）
const titleInputRef = useRef<HTMLInputElement>(null);
```

> **注**: `searchInputRef` は既存の検索入力フィールドに、`titleInputRef` は既存の「ほんのタイトル」入力フィールドにそれぞれ `ref` を付与する。

### 各ボタンの動作

| ボタン | 動作 |
|--------|------|
| 🔍 もういちど けんさく | 検索クエリをクリア→検索結果をリセット→`hasSearched` を false に→検索入力にフォーカス |
| 📷 バーコードで しらべる | バーコードスキャナーを表示（`setShowScanner(true)`、既存ロジック流用） |
| ✏️ じぶんで にゅうりょく | `hasSearched` を false に→タイトル入力欄へスムーズスクロール→フォーカス |

### 受け入れ条件

- [ ] 検索結果が0件の場合、テキストの代わりに3ボタンのリカバリカードが表示される
- [ ] 「もういちど けんさく」を押すと検索入力がクリアされフォーカスが移る
- [ ] 「バーコードで しらべる」を押すとバーコードスキャナーが起動する
- [ ] 「じぶんで にゅうりょく」を押すとタイトル入力欄にスムーズスクロールしフォーカスが移る
- [ ] リカバリカードのデザインが警告的すぎず、やさしい雰囲気（amber系）になっている
- [ ] 既存の検索成功フロー（結果表示→選択→自動入力）にリグレッションがない

### 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `components/kid-record-form.tsx` | 検索0件表示の置換、ref 2つ追加、リカバリボタンのクリックハンドラ追加 |

### 工数見積もり

**小**（条件分岐内のUI差し替え + ref追加。ロジック変更は最小限）

---

## 実施順序と全体スケジュール

```
3.7b-1（空状態CTA）   ─→ 4ファイル変更、ロジック変更なし
  │                       約1時間
  ↓
3.7b-3（検索0件UI）   ─→ 1ファイル変更、ref追加のみ
  │                       約1時間
  ↓
3.7b-2（かんたんモード）─→ 1ファイル変更、state + 条件分岐追加
                           約2〜3時間
```

**合計想定: 半日〜1日**

### 実施順序の理由

1. **3.7b-1 を最初に**: 変更箇所が分散（4ファイル）だが、各変更は独立で小さい。全画面の空状態を一括で改善し、初回体験の「沈黙」を解消する。
2. **3.7b-3 を次に**: 記録フォーム内の変更だが、3.7b-2 とは独立した箇所（検索結果エリア）。先に片付ける。
3. **3.7b-2 を最後に**: 記録フォーム全体に影響するため、3.7b-3 の変更が安定した後に着手。テスト範囲が最も広い。

---

## テスト観点

### 3.7b-1: 空状態CTA

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T1-1 | 記録0件のユーザーでホーム画面の空状態CTAが表示される | 新規子どもアカウントでホームを確認 |
| T1-2 | CTAボタンが `/kids/records/new` に正しく遷移する | 各画面のCTAボタンをタップ |
| T1-3 | 記録が1件以上ある場合、空状態が表示されない | 1件記録後に各画面を再確認 |
| T1-4 | 本棚のジャンル別空状態で、他ジャンルに記録がある場合のみジャンル別メッセージが表示される | story のみ記録 → zukan タブで空状態確認 |

### 3.7b-2: かんたんモード

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T2-1 | デフォルトが「かんたん」モードになっている | フォーム初回表示で確認 |
| T2-2 | かんたんモードでタイトル+スタンプのみで保存できる | バーコードで本を選択→スタンプ→保存 |
| T2-3 | かんたんモードの保存で `status=finished`, `finishedOn=今日` が DB に入る | Supabase でレコード確認 |
| T2-4 | かんたんモードでも検索で取得した著者・ISBN・表紙が保存される | 検索選択後に保存→DB確認 |
| T2-5 | くわしくモードで全項目が表示され、既存通り保存できる | モード切替→全項目入力→保存 |
| T2-6 | かんたん→くわしく切替で入力済みデータが消えない | タイトル入力→モード切替→タイトルが残っていることを確認 |
| T2-7 | くわしく→かんたん切替で入力済みデータが消えない | 全項目入力→かんたんに切替→くわしくに戻す→全データ残存確認 |

### 3.7b-3: 検索0件リカバリ

| # | テスト項目 | 確認方法 |
|---|-----------|---------|
| T3-1 | 存在しない書名で検索→3ボタンのリカバリカードが表示される | 「あああああ」等で検索 |
| T3-2 | 「もういちど けんさく」→検索入力がクリアされフォーカスが移る | ボタンタップ→入力欄が空でフォーカス |
| T3-3 | 「バーコードで しらべる」→スキャナーが起動する | ボタンタップ→カメラUI表示 |
| T3-4 | 「じぶんで にゅうりょく」→タイトル入力欄にスクロール＋フォーカス | ボタンタップ→スクロール動作 |
| T3-5 | 検索成功時はリカバリカードが表示されない | 正しい書名で検索→結果一覧のみ表示 |

---

## DB変更

**なし**。3.7b は全てフロントエンド（UI）のみの変更。

---

## 既存ロジックへの影響

| 項目 | 影響 |
|------|------|
| サーバーアクション（`createKidRecord`） | 変更なし |
| バリデーション（`createKidRecordSchema`） | 変更なし |
| バッジ判定ロジック | 変更なし |
| リダイレクト先 | 変更なし（3.8-5 で対応） |
| RLS ポリシー | 変更なし |
| API 連携（書籍検索） | 変更なし |

---

## Step 3.8 との接続点

| 3.7b 項目 | 3.8 での発展 |
|-----------|-------------|
| 3.7b-1（空状態CTA） | 3.8-1 でミッション導入後、空状態に「ミッションをはじめよう！」のCTAを追加可能 |
| 3.7b-2（かんたんモード） | 3.8-5（記録完了画面）で「もっとくわしく きろくする？」の編集導線を提供。4-7（年齢適応UI）で低学年デフォルト=かんたん、中学年以上デフォルト=くわしくに自動切替 |
| 3.7b-3（検索0件リカバリ） | 3.8-4（おすすめカード）で「おすすめの本をさがす」ボタンを追加可能 |
