# Phase 0 計測イベント一覧（KPI基準）

## 目的
Phase 2〜3でのUX改善効果を比較可能にするため、事前にイベント定義を固定する。

---

## 1. 既存イベント（実装済み）

`lib/analytics/navigation-events.ts` で確認できるイベント。

| イベント名 | 主用途 | 主対象 |
|---|---|---|
| `dashboard_action_click` | ダッシュボード上の操作計測 | 保護者 |
| `dashboard_child_quick_add_click` | 子ども追加系アクション計測 | 保護者 |
| `kid_home_notice_click` | 子どもホームのお知らせ反応 | 子ども |
| `kid_home_nav_click` | 子どもホームからの遷移計測 | 子ども |
| `record_create_start` | 記録開始計測 | 子ども/保護者 |
| `record_create_submit` | 記録完了計測 | 子ども/保護者 |
| `kid_message_mark_read` | メッセージ既読計測 | 子ども |
| `mission_set` | ミッション設定計測 | 保護者 |

---

## 2. Phase 0 KPIマッピング

### 子どもKPI
| KPI | 算出イメージ | 関連イベント |
|---|---|---|
| 記録開始率 | `record_create_start / kid_home_nav_click(記録遷移)` | `kid_home_nav_click`, `record_create_start` |
| 記録完了率 | `record_create_submit / record_create_start` | `record_create_start`, `record_create_submit` |
| メッセージ到達率 | `kid_message_mark_read / メッセージ表示セッション` | `kid_message_mark_read` |

### 保護者KPI
| KPI | 算出イメージ | 関連イベント |
|---|---|---|
| 初回行動到達速度 | ログイン後最初の`dashboard_action_click`までの時間 | `dashboard_action_click` |
| 子ども導線活用率 | `dashboard_child_quick_add_click / ダッシュボードセッション` | `dashboard_child_quick_add_click` |
| 支援行動実行率 | コメント/リアクション実行数（既存アクションログと突合） | `dashboard_action_click` + サーバー側記録 |

---

## 3. Phase 0追加ルール（命名・付帯情報）

- event名は `snake_case` 固定。
- `childId` を取得可能な画面では必ず付与。
- `target` はUI要素名を統一（例: `primary_cta_record`）。
- `meta` は最小限（画面バリアント・AB群のみ）。

---

## 4. 品質ゲート

- [x] KPIごとに参照イベントを定義
- [x] 子ども/保護者KPIを分離
- [x] 命名規約を定義
- [x] Phase 1着手前に計測比較可能な状態を確保

