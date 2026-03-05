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

実行例（service_role）:

```sql
select public.purge_kid_auth_audit_logs(180);
select public.purge_family_invite_audit_logs(180);
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

## 6. インシデント時の一次対応

1. 該当 `child_id` / `actor_user_id` / `ip` をログで特定
2. 必要に応じて対象招待コードを無効化
3. 必要に応じて子どもの PIN 再設定を保護者へ案内
4. 影響範囲（family_id単位）を確認
5. 対応ログを社内チケットに記録

## 7. 今後の拡張

- アラートを自動通知（Slack/Webhook）へ連携
- 保持期間管理の自動実行（Scheduled SQL / cron）を本番環境に接続
- service-role 依存解消後、RLS中心の監査ビューを整備
