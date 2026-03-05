# Step3 実装整合レビュー（2026-03-05）

対象:
- 仕様書: `docs/spec-v0.1.md`
- 計画書: `docs/phase-plan-v2.md`
- 詳細設計: `docs/step3-detailed-design.md`
- 実装: Step3 関連の migration / page / action / lib

## 総評

Step3 の 3-1〜3-7 は**機能としては概ね実装済み**です。
一方で、詳細設計の「権限モデル（child_session + RLS）」と実装の「service role 直アクセス」には乖離があり、
セキュリティ観点では **P0 で追加是正が必要**です。

---

## 0. 対応状況（2026-03-05 追記）

- ✅ `KID_SESSION_SECRET` を必須化（固定フォールバック廃止）
- ✅ `kids/login` / kid PINログイン処理で `SUPABASE_SERVICE_ROLE_KEY` と `KID_SESSION_SECRET` を必須チェック
- ✅ `app/settings/children/page.tsx` の未使用変数を解消し、`npm run lint` / `npm run build` が通る状態へ改善
- ✅ 詳細設計書の API / 画面経路を Server Actions 実装に合わせて更新
- ✅ kid PIN 認証イベントの監査ログ（`kid_auth_audit_logs`）を追加
- ✅ 招待操作イベントの監査ログ（`family_invite_audit_logs`）を追加
- ✅ 監査ログ保持期間の削除関数（`purge_*_audit_logs`）を追加
- ✅ 監査ログ定期削除ランナー（`run_audit_log_maintenance`）を追加
- ✅ 監査ログアラート候補抽出関数（`get_audit_alert_candidates`）を追加
- ✅ kid PIN認証のテーブル直接参照をRPC化し、認証アクションのservice role直アクセスを縮小
- ✅ kid PIN認証RPCの権限を `service_role` のみに制限（anon/authenticated 実行を禁止）
- ✅ 監査ログメタデータ（IP / UA）のサニタイズを追加
- ✅ family招待監査ログの書き込み経路を service_role RPC に一本化（authenticated 直接insertを廃止）
- ✅ Phase A として kid 読み取り系（home/records/calendar）の直接テーブル参照をRPC化
- ✅ Phase B として kid 詳細/メッセージ導線（records/[recordId], messages, 既読更新）の直接参照をRPC化
- ✅ Phase C として kid 記録作成/バッジ評価・取得（kid-record action, badges lib）の直接参照をRPC化
- ⏳ service role 依存の段階的解消（RLS 中心化）は次段で継続対応

---

## 1. スコープ達成状況（3-1〜3-7）

| 項目 | 判定 | 根拠 |
|---|---|---|
| 3-1 子どもPINログイン | 実装済み（要改善あり） | `child_auth_methods` と PIN 検証・ロック実装あり |
| 3-2 スタンプ評価 | 実装済み | `record_reactions_child` と記録時保存あり |
| 3-3 気持ちタグ | 実装済み | `record_feeling_tags` と複数タグ保存あり |
| 3-4 読書バッジ | 実装済み | `badges` / `child_badges`・判定ロジックあり |
| 3-5 読書カレンダー | 実装済み | `/kids/calendar` で月次表示あり |
| 3-6 ファミリー招待（コード/QR） | 実装済み（経路差異あり） | 招待作成・失効・受け入れと QR 表示あり |
| 3-7 おやからのメッセージ | 実装済み | コメント/リアクション一覧 + 既読管理あり |

---

## 2. 主要な不整合・懸念点

## P0: 詳細設計の権限モデルとの差異（`child_session + RLS` 未達）

詳細設計では「子どもセッションを JWT claim で表現し、RLS で `child_id` / `family_id` 制御」を想定しているが、
実装は子ども導線で Supabase の **service role** クライアントを多用している（kid PIN 認証は RPC 化済みだが、現時点では service_role 実行前提）。

- `createAdminClient()` は `SUPABASE_SERVICE_ROLE_KEY` で DB にアクセスする。
- 子どもページ/アクションもこの admin client を直接利用している。

この構成だと、DB 側 RLS を前提にした境界防御ではなく、
アプリコードでの `.eq('child_id', childId)` に依存するため、設計意図（RLS 中心）から外れる。

## P0: 子どもセッション秘密鍵のデフォルトフォールバック（対応済み）

本項目は対応済み。
`lib/kids/session.ts` は `KID_SESSION_SECRET` を必須とし、
未設定時は署名・セッション確立を実行しない fail-close 挙動に変更した。

## P1: 設計ドキュメント上の API/画面経路とのずれ

`docs/step3-detailed-design.md` に記載された API（`/api/kids/...`、`/api/family/invites...`）は未実装で、
実装は Server Actions 中心になっている。
また、画面一覧にある `/family/invite` は実装上 `/invite` で提供されている。

※ 実装方針として Server Actions を採ること自体は問題ないが、
  ドキュメントの更新がないため、保守時に誤解を生む。

## P1: 受け入れ基準の検証結果（更新）

`npm run lint` / `npm run build` は現時点で実行済み。
今後はレビュー文書または CI ログへの恒常的なリンク付けを運用ルール化する。

---

## 3. 文書間比較の要点

- `phase-plan-v2` の Step3 機能粒度（3-1〜3-7）には実装はほぼ追従。
- `step3-detailed-design` の DB テーブル追加方針には概ね追従。
- ただし、同詳細設計の「権限設計」と「API 設計」は実装実態と差分がある。

---

## 4. 推奨アクション（残課題）

1. **P0 継続**: kid 導線の DB アクセスを service role 依存から分離する（RLS + 子ども専用クレームに寄せる）。
2. **P1**: 子ども専用クレーム導入後に RLS policy を child_session 起点へ寄せ、アプリ側 `.eq(child_id)` 依存を薄くする。
3. **P1 対応済み**: 監査ログの運用手順（確認頻度・保持期間・アラート条件）を文書化した（`docs/security-audit-log-runbook.md`）。

