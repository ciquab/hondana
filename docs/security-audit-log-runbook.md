# 監査ログ運用ランブック（Step3）

対象ログ:
- `kid_auth_audit_logs`（子ども PIN 認証）
- `family_invite_audit_logs`（家族招待の作成・無効化・受け入れ）

## 1. 目的

- 不正ログイン試行や招待コード悪用の早期検知
- 事後調査時に「いつ・誰が・何をしたか」を追跡可能にする
- Step3 セキュリティ要件（監査ログ）を運用で担保する

## 2. 確認頻度（SLO）

- 毎日1回（平日）: ダッシュ確認（直近24時間）
- 毎週1回: 異常傾向レビュー（直近7日）
- インシデント発生時: 直近30日を即時調査

## 3. 保持期間

- 標準保持: 180日
- セキュリティインシデント関連: クローズ後 1年
- 期限を過ぎたログは定期削除（将来: Supabase Scheduled Function）


### 3.1 定期削除ジョブ（実装済み）

監査ログ削除用のDB関数を追加済み:
- `public.purge_kid_auth_audit_logs(retention_days int default 180)`
- `public.purge_family_invite_audit_logs(retention_days int default 180)`

また、定期ジョブから呼ぶための統合ランナーを追加済み:
- `public.run_audit_log_maintenance(retention_days int default 180)`
  - 2種類の削除関数を実行
  - 実行履歴を `audit_log_maintenance_runs` に保存

実行例（service_role）:

```sql
select * from public.run_audit_log_maintenance(180);
```

## 4. アラート条件（初期）

### 4.1 子ども PIN 認証 (`kid_auth_audit_logs`)

- 同一 `child_id` で `pin_failed` / `pin_locked` が 10分以内に 5回以上
- 同一IPで複数 `child_id` への `child_not_found` が 10分以内に 10回以上
- `locked` イベントが 1日で 3回以上

### 4.2 招待操作 (`family_invite_audit_logs`)

- 同一 `actor_user_id` で `create_invite_success` が 1時間で 20回以上
- `accept_invite_failed` が 10分で 10回以上（総量）
- `revoke_invite_failed` が連続5件以上

## 5. 日次確認SQL（例）

### 5.1 直近24時間の PIN 失敗上位

```sql
select
  child_id,
  count(*) as failed_count
from public.kid_auth_audit_logs
where created_at >= now() - interval '24 hours'
  and event_type in ('pin_failed', 'pin_locked', 'locked')
group by child_id
order by failed_count desc
limit 20;
```

### 5.2 直近24時間の招待失敗イベント

```sql
select
  action,
  count(*) as cnt
from public.family_invite_audit_logs
where created_at >= now() - interval '24 hours'
  and action in ('create_invite_failed', 'revoke_invite_failed', 'accept_invite_failed')
group by action
order by cnt desc;
```

### 5.3 直近24時間で多発したIP

```sql
select
  metadata->>'ip' as ip,
  count(*) as cnt
from public.kid_auth_audit_logs
where created_at >= now() - interval '24 hours'
group by metadata->>'ip'
having count(*) >= 20
order by cnt desc;
```


## 5.4 アラート候補抽出（実装済み関数）

手動SQLに加えて、閾値超過候補をまとめて取得できます。

```sql
select * from public.get_audit_alert_candidates(10);
```

返却される `category` 例:
- `kid_pin_fail_burst`
- `kid_child_not_found_ip_burst`
- `invite_accept_fail_burst`

## 6. インシデント時の一次対応

1. 該当 `child_id` / `actor_user_id` / `ip` をログで特定
2. 必要に応じて対象招待コードを無効化
3. 必要に応じて子どもの PIN 再設定を保護者へ案内
4. 影響範囲（family_id単位）を確認
5. 対応ログを社内チケットに記録

## 7. 今後の拡張

- `get_audit_alert_candidates(10)` の結果をSlack/Webhookへ自動通知
- `run_audit_log_maintenance(180)` を Scheduled SQL / cron で日次実行
- service-role 依存解消後、RLS中心の監査ビューを整備

## 8. Migration検証CI失敗時の運用（Task3）

### 8.1 対象ジョブ

- GitHub Actions: `verify-migrations`
- ワークフロー: `.github/workflows/migration-verify.yml`
- 検証スクリプト: `scripts/ci/verify-migrations.sh`

### 8.2 役割分担（DRI）

- **一次対応（15分以内）**: PR作成者
- **二次対応（60分以内）**: DBオーナー（Step3担当）
- **最終承認**: レビュワー（最低1名）

### 8.3 一次切り分け手順

1. CIログで失敗した migration ファイル名を特定
2. 同ブランチで以下をローカル実行して再現確認
   - `bash scripts/ci/verify-migrations.sh`
3. 失敗種別を分類
   - 依存順序ミス（前提テーブル/関数不足）
   - grant/policy の対象不足（role/function signature不一致）
   - SQL構文・型不整合
4. PRに「原因」「暫定対応」「恒久対応」をコメント

### 8.4 復旧方針

- 原則: **forward-fix**（新しい migration を追加して修復）
- 既に共有された migration の書き換えは原則禁止
- 例外: 未共有ブランチ内でのみ修正可

### 8.5 エスカレーション条件

以下に該当する場合は、即時 DB オーナーにエスカレーション:
- 同一失敗が2回連続
- `child_session` role / grant / policy に関する失敗
- `kid_auth_audit_logs` や認証RPC（PIN）周辺の失敗

### 8.6 完了条件

- `verify-migrations` が green
- 失敗原因と対応内容を PR に記録
- 必要なら本ランブックへ再発防止策を追記


## 9. Migration作成時の互換性チェック（Task4）

`verify-migrations` での失敗を未然に防ぐため、SQL作成時に以下を確認する。

### 9.1 authスキーマ依存の確認

- `auth.users` の列参照は、対象環境で存在する列に限定する
- `auth.users` 依存が必須でない backfill は、`public` 側テーブルのみで完結する形を優先する
- `auth.role()` のような環境差異がある関数は使わず、JWT claim (`request.jwt.claims`) を参照する

### 9.2 RLS policy 記述ガイド

- role 判定は以下の形式を推奨:
  - `coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) = 'service_role'`
- `with check` / `using` の両方に同等条件が必要かを確認する
- policy追加後は `revoke` / `grant` と合わせて、実行主体が最小権限になっているか確認する

### 9.3 PRチェックリスト（DB変更時）

- [ ] `bash scripts/ci/verify-migrations.sh` をローカルで実行（`DATABASE_URL` 必須）
- [ ] 追加した migration が `supabase/migrations` の時系列順になっている
- [ ] `auth.*` 依存を追加した場合、理由と代替不可性を PR本文へ明記
- [ ] RLS / grant 変更時、影響ロール（`anon` / `authenticated` / `child_session` / `service_role`）をPR本文へ明記

### 9.4 失敗パターン早見表

- `column ... does not exist`:
  - 参照先テーブルの列が環境差異で欠落。`public`側のみで完結できるか再検討
- `function auth.role() does not exist`:
  - role判定を JWT claim 参照へ置換
- `permission denied for table ...`:
  - policy対象ロールと grant/revoke の順序・対象を見直す
