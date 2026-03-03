# Day1実装方針（実装済み範囲）

## 目的
「親ログイン → 家族作成 → 子どもプロフィール作成」までの土台を最小構成で成立させる。

## 実装範囲
- Supabase Auth（メール+パスワード）
- ガード付き画面（middleware）
- families / family_members / children のDDL
- family境界の最小RLS
- 最低限の画面
  - `/login`
  - `/dashboard`
  - `/settings/family`
  - `/settings/children`

## 意図的な非対応
- reading_records / books / comments
- API Route経由のBFF
- 複雑なUI
- 厳密バリデーション
