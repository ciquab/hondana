# Step3 実装整合レビュー（2026-03-05）

対象:
- 仕様書: `docs/spec-v0.1.md`
- 計画書: `docs/phase-plan-v2.md`
- 詳細設計: `docs/step3-detailed-design.md`
- 実装: Step3 関連の migration / page / action / lib

## 総評

Step3 の 3-1〜3-7 は**機能実装・運用整備を含めて完了**です。
child_session + RLS への移行、kid認証のハードニング、migration検証CIと運用ランブック（Task3/Task4）まで反映し、
Step3 スコープの残課題はクローズしました。

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
- ✅ child_session クレーム解釈ヘルパーと kid 主要テーブル向け RLS スキャフォールドを追加（Phase D 準備）
- ✅ child_session 向け write 系 RLS スキャフォールド（stamp / feeling tag / message既読）を追加（Phase E 準備）
- ✅ `child_session` 用DBロール作成・grant付与、および child_session policy の適用先を `authenticated` から `child_session` へ修正
- ✅ `child_session` ロールを `authenticator` から引き受け可能にし（`grant child_session to authenticator`）、JWT role 運用の前提を補強
- ✅ `child_session <- authenticated` 継承を撤廃し、`to authenticated` policy への意図しない包含を防止（権限境界を子ども専用に明確化）
- ✅ kid画面/Server Actionの主要導線（home/records/calendar/messages/record作成/既読/badge取得・評価）を `child_session` JWT + anon client 実行へ切替
- ✅ kid PIN 認証RPCの権限を再ハードニング（`service_role` 限定）し、匿名クライアントからの `pin_hash` 取得リスクを解消
- ✅ kid PIN監査ログRPCでDB側メタデータサニタイズ（IP/UAの改行除去・長さ制限）を追加し、入力経路依存を低減
- ✅ kid PIN監査ログRPCで `event_type` ホワイトリスト化と `reason` サニタイズ（改行除去・長さ制限）を追加
- ✅ kid PINログインで `childId` UUID形式バリデーションを追加し、不正入力時のRPC実行を事前遮断
- ✅ kid PIN認証で「子ども未存在/未設定/ロック中」経路にもダミーscryptコストを追加し、失敗時タイミング差を緩和
- ✅ `kid_session` Cookie復号時に `childId` / `familyId` のUUID検証を追加し、改ざんトークンを早期破棄
- ✅ CIで migration を先頭から適用検証するワークフロー（PostgreSQL service + `scripts/ci/verify-migrations.sh`）を追加
- ✅ Step3対象の高優先残課題（migration失敗運用 / 互換性チェック）を Task3/Task4 として文書化し、運用に組み込み済み

---

## 1. スコープ達成状況（3-1〜3-7）

| 項目 | 判定 | 根拠 |
|---|---|---|
| 3-1 子どもPINログイン | 実装済み | `child_auth_methods` と PIN 検証・ロック実装あり |
| 3-2 スタンプ評価 | 実装済み | `record_reactions_child` と記録時保存あり |
| 3-3 気持ちタグ | 実装済み | `record_feeling_tags` と複数タグ保存あり |
| 3-4 読書バッジ | 実装済み | `badges` / `child_badges`・判定ロジックあり |
| 3-5 読書カレンダー | 実装済み | `/kids/calendar` で月次表示あり |
| 3-6 ファミリー招待（コード/QR） | 実装済み | 招待作成・失効・受け入れと QR 表示あり |
| 3-7 おやからのメッセージ | 実装済み | コメント/リアクション一覧 + 既読管理あり |

---

## 2. 主要な不整合・懸念点（クローズ状況）

- ✅ **権限モデル差分**: kid主要導線（home/records/calendar/messages/record作成/既読/badge取得・評価）は `child_session` JWT + RLS 実行へ移行済み。
- ✅ **セッション秘密鍵フォールバック**: `KID_SESSION_SECRET` 必須化により fail-close 化済み。
- ✅ **設計ドキュメントとの差分**: API/画面経路は Server Actions 実装に合わせて更新済み。
- ✅ **受け入れ基準検証**: `npm run lint` / `npm run build` 実行済み。
- ✅ **運用残課題**: migration 検証CI失敗時手順（Task3）と migration作成互換性チェック（Task4）をランブックへ反映済み。

---

## 3. 文書間比較の要点

- `phase-plan-v2` の Step3 機能粒度（3-1〜3-7）には実装はほぼ追従。
- `step3-detailed-design` の DB テーブル追加方針には概ね追従。
- 詳細設計の「権限設計」「API/画面経路」の差分は、設計書更新と実装反映で Step3 スコープ内は解消済み。

---

## 4. 推奨アクション（Step3完了後）

1. **継続改善（Step4以降）**: 認証/監査のさらなる最小権限化は、Step4 の非機能改善トラックで計画的に進める。
2. **運用定着**: Task3/Task4 のランブック運用（PRテンプレ連携、担当者ローテーション）を継続する。
3. **回帰監視**: `verify-migrations` と `npm run lint` / `npm run build` をマージ前必須チェックとして維持する。

