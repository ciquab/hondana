# 年齢切替仕様の確認テストケース（Sprint2）

## 目的
- ひらがな化が年齢切替仕様（junior/standard）に沿って動作することを確認する。
- 8歳向け（junior）主要文言が想定どおり表示されることを確認する。

## 前提
- 対象 child の `birth_year` と `age_mode_override` を変更できる状態であること。
- こどもログイン済みで `home / messages / records` へ遷移できること。

## テストケース

### TC-01: auto + 8歳で junior になる
- 条件: `age_mode_override=auto`, 現在年から算出して 8歳になる `birth_year`
- 手順: こどもホームを開く
- 期待結果:
  - 「さいきん よんだ ほん」が表示される
  - 「まえの きろくを みる」が表示される

### TC-02: auto + 9歳で junior になる
- 条件: `age_mode_override=auto`, 現在年から算出して 9歳になる `birth_year`
- 手順: こどもホームを開く
- 期待結果:
  - 「さいきん よんだ ほん」が表示される
  - 「まえの きろくを みる」が表示される

### TC-03: auto + 10歳で standard になる
- 条件: `age_mode_override=auto`, 現在年から算出して 10歳になる `birth_year`
- 手順: こどもホームを開く
- 期待結果:
  - 「最近読んだ本」が表示される
  - 「過去の記録を見る」が表示される

### TC-04: override=junior が優先される
- 条件: `age_mode_override=junior`（年齢は 9歳以上でも可）
- 手順: こどもホーム/メッセージを開く
- 期待結果:
  - 「ぜんぶ みる」が表示される
  - 「みどく n けん」など junior 文言になる

### TC-05: override=standard が優先される
- 条件: `age_mode_override=standard`（年齢は 8歳以下でも可）
- 手順: こどもホーム/メッセージを開く
- 期待結果:
  - 「すべて見る」が表示される
  - 「未読 n 件」など standard 文言になる

### TC-06: 「おうちのひと」用語統一
- 条件: junior / standard それぞれで確認
- 手順: こどもホーム下部メッセージカード、メッセージ空状態、おすすめセクションを確認
- 期待結果:
  - 「おうちのひとからのメッセージ」
  - 「おうちのひとからのおすすめ」
  - 「本を読んで記録すると、おうちのひとから…」

## 自動テスト対応
- `lib/kids/__tests__/age-mode.test.ts`
  - 9歳以下で junior
  - 10歳以上で standard
  - override 優先
- `lib/kids/__tests__/age-text.test.ts`
  - `ageText` が junior / standard の正しい文言を返す
