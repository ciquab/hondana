# ログイン画面メイン画像 生成プロンプト（親向け `/login`）

## 前提（コードから読み取れる要件）
- 親向けログイン画面 `/login` は「メールアドレス＋パスワード」認証で、子どもの読書を見守る保護者が主対象。
- 画面はシンプルなカードUI（白背景カード + 影）で、全体トーンは `bg-slate-50` / `text-slate-900`。
- プロダクト「ほんだな」は、家族で読書記録を共有し、子どもの読書体験を応援する文脈。

## そのまま使える生成プロンプト（日本語）

以下を画像生成AIへ入力してください。

```text
家族向け読書記録Webアプリ「ほんだな」の親向けログイン画面に使う、横長のヒーロー画像を作成してください。

目的:
- 初回訪問の保護者に「安心感」「やさしさ」「子どもの成長を見守る温かさ」を一目で伝える
- UI上にログインフォーム（白いカード）を重ねても視認性が落ちない、ノイズの少ない背景寄りメインビジュアル

構図・内容:
- 室内の落ち着いた読書シーン
- 親と小学生くらいの子どもが同じ本棚の前で一緒に本を選んでいる
- 笑顔は自然で控えめ、誇張しすぎない
- 主役は「本」「本棚」「見守る親子の距離感」
- テキストやロゴ、UIパーツは入れない

デザイン要件:
- フラット寄りのやわらかいデジタルイラスト（3D・写真風ではなく、現代的な2Dイラスト）
- 色調は明るめで低彩度、スレート系と暖色アクセント
- 推奨カラーパレット:
  - 背景: #f8fafc（slate-50系）
  - 文字想定の濃色: #0f172a（slate-900系）
  - アクセント: #2563eb（blue-600系）、#f59e0b（amber-500系）を少量
- コントラストは中程度、強すぎる影・派手すぎる発色は避ける
- 余白を十分に確保し、片側にUIカードを重ねられるネガティブスペースを作る

出力仕様:
- アスペクト比 16:9
- 解像度 1920x1080 以上
- PNG

ネガティブ指定:
- 文字、ウォーターマーク、ロゴ、過度な装飾、強いボケ、暗すぎる照明、恐怖・不安を想起する演出、写実写真風、過度なアニメ調、雑然とした背景
```

## 英語版（モデルが英語で安定する場合）

```text
Create a wide hero image for the parent login page of a family reading-record web app called "Hondana".

Goal:
- Immediately communicate safety, warmth, and supportive parenting.
- Keep the background clean enough so a white login form card can be overlaid without losing readability.

Scene:
- Calm indoor reading environment.
- A parent and an elementary-school-age child choosing books together in front of a bookshelf.
- Natural, subtle smiles (not exaggerated).
- Focus on books, bookshelf, and caring parent-child interaction.
- No text, no logos, no UI elements.

Style:
- Soft modern 2D digital illustration (not photorealistic, not 3D render).
- Bright, low-saturation palette with slate-like neutrals and small warm accents.
- Suggested colors: background #f8fafc, dark tone #0f172a, accents #2563eb and #f59e0b (sparingly).
- Medium contrast, soft shadows, clean composition.
- Leave clear negative space on one side for an overlaid login card.

Output:
- 16:9 aspect ratio
- At least 1920x1080
- PNG

Negative prompt:
- text, watermark, logo, heavy decorations, extreme blur, dark/moody lighting, scary mood, photorealism, overly anime style, cluttered background
```

## 微調整用の追加フレーズ（必要時）
- 「左側に広い余白を確保して、右側に親子と本棚を配置」
- 「本の背表紙は抽象化し、判読可能な文字は描かない」
- 「子ども向けすぎない、保護者が信頼できる落ち着いたトーン」
- 「やわらかい朝の自然光、清潔感のある室内」

## 生成結果レビュー観点（採用判断チェックリスト）
- **UI適合**: 左右どちらかに、ログインカードを重ねても情報が埋もれない余白があるか。
- **感情トーン**: 「安心」「見守り」「清潔感」が伝わるか。寒色に寄りすぎて冷たい印象になっていないか。
- **視線誘導**: 人物 → 本棚 → 余白の順で視線が流れ、主役（親子と本）が明確か。
- **実装適合**: 16:9でトリミングしても主要要素が欠けないか。
- **禁止要素**: 文字・ロゴ・ウォーターマーク・読める本の背表紙が混入していないか。

## 今回のような出力をさらに改善する再生成プロンプト

以下は「構図は良いが、少しクールすぎる／温かさを増やしたい」場合の調整版です。

```text
前回画像の構図（片側の余白 + 反対側の親子と本棚）は維持しつつ、感情トーンをもう一段あたたかくしてください。

改善ポイント:
- 白〜薄グレーの単調な背景を避け、朝の自然光が入るやわらかな室内トーンにする
- 肌色と木目（明るいオーク系）を少し加え、冷たすぎる印象を減らす
- 線画コントラストを少し弱め、輪郭をやわらかくする
- 親子の表情を「自然で穏やかな笑顔」にし、見守り感を強める
- UI重ね用の余白は維持（画面の35〜45%）

維持する条件:
- 2Dデジタルイラスト
- テキスト・ロゴなし
- 16:9 / 1920x1080以上 / PNG

ネガティブ指定:
- 無機質すぎる灰色背景、硬すぎる線、暗い照明、強すぎる影、写実写真風、文字要素
```

## アプリ名を「よめたね！／Yometane!」にする場合のプロンプト

「よめたね！（読めた達成感をほめる）」の語感に合わせて、
**安心感に加えて、達成のよろこび・自己効力感**が伝わるように寄せるテンプレートです。

### 日本語プロンプト（よめたね！版）

```text
家族向け読書記録Webアプリ「よめたね！ / Yometane!」の親向けログイン画面に使う、横長のヒーロー画像を作成してください。

ブランドイメージ:
- 「よめたね！」= 子どもの“読めた”を認めてほめる、達成を積み重ねる
- 温かく安心できる雰囲気 + 小さな成功体験の喜び

目的:
- 保護者に「信頼できる」「子どもの成長を一緒によろこべる」印象を与える
- 白いログインカードを重ねる前提で、片側に十分な余白を確保する

構図:
- 親と小学生の子どもが本棚の前で本を手に取り、読了や選書の達成感を共有している
- 子どもは達成感のある自然な笑顔（大げさすぎない）
- 親は見守りつつ、肯定するやわらかな表情
- 人物と本棚は画面の右寄せ（または左寄せ）に配置し、反対側はネガティブスペース

スタイル:
- やわらかい2Dデジタルイラスト
- 低彩度ベース + ほめる気持ちを感じる暖色アクセント
- ベースは slate 系（#f8fafc, #0f172a）
- アクセントにブルー/アンバー/コーラルを少量（例: #2563eb, #f59e0b, #fb7185）
- 清潔感のある朝〜昼の自然光

出力:
- 16:9, 1920x1080以上, PNG
- テキスト・ロゴ・ウォーターマークなし

ネガティブ指定:
- 暗すぎる雰囲気、無機質な灰色一色、過度に子ども向けすぎるポップ表現、写実写真風、強いノイズ、読める文字
```

### English Prompt (Yometane! version)

```text
Create a wide hero illustration for the parent login page of a family reading-record app named "Yometane!".

Brand direction:
- "Yometane!" conveys celebrating a child's achievement: "You read it!"
- Keep trust and calmness, while adding a gentle sense of accomplishment and encouragement.

Goal:
- Communicate reliability for parents and the joy of children's reading progress.
- Keep one side clean for overlaying a white login card.

Scene and composition:
- Parent and elementary-school-age child in front of a bookshelf, sharing a moment of reading achievement.
- Child expression should show natural confidence and small success (not exaggerated).
- Parent expression should be warm, supportive, and affirming.
- Place characters/bookshelf on one side and keep clear negative space on the other.

Style and color:
- Soft modern 2D illustration, not photorealistic.
- Low-saturation base with subtle warm celebratory accents.
- Base tones: #f8fafc and #0f172a.
- Accent colors used sparingly: #2563eb, #f59e0b, #fb7185.
- Clean daylight ambiance, soft shadows, uncluttered background.

Output:
- 16:9, at least 1920x1080, PNG
- No text, no logos, no watermark

Negative prompt:
- overly dark mood, sterile flat gray background, overly childish cartoon style, photorealism, heavy noise, readable text on book spines
```

## PWA用アプリアイコン 生成プロンプト（よめたね！／Yometane!）

まずはPWA用途を想定し、
**小さいサイズでも判読しやすい・単体でブランド想起できる**ことを最優先にしたプロンプトです。

### 日本語プロンプト（PWAアイコン）

```text
家族向け読書記録アプリ「よめたね！ / Yometane!」のPWA用アプリアイコンを作成してください。

コンセプト:
- 「読めた！」という達成感を、やさしく肯定する
- 親しみやすいが幼すぎない
- 小さい表示でも識別できるシンプル形状

デザイン要件:
- 正方形キャンバス前提（1:1）
- 中央に主モチーフを1つ（本 + チェック / 本 + きらめき / 本 + やさしい笑顔の記号 など）
- 余計な細線・小要素を減らし、48pxでも判別できる太さにする
- フラット寄りの2Dデジタルイラスト
- 背景は単色またはごく弱いグラデーション
- 文字・ロゴタイプは入れない（「よめたね！」の文字を描かない）

カラー:
- ベース: #0f172a または #f8fafc
- アクセント: #2563eb, #f59e0b, #fb7185 を2〜3色以内で使用
- 高コントラストで視認性を優先

出力:
- 1024x1024 PNG（透明背景版も1枚）
- 角丸なしの正方形原稿（角丸はOS側マスクに任せる）
- 余白率は外周10〜16%を目安に確保

ネガティブ指定:
- 細かすぎる装飾、読める文字、写真風、複雑な背景、低コントラスト、複数モチーフの詰め込み
```

### English Prompt (PWA icon)

```text
Create a PWA app icon for a family reading-record app named "Yometane!".

Concept:
- Celebrate a child’s reading achievement with a warm, encouraging feeling.
- Friendly but not overly childish.
- Highly recognizable at small sizes.

Design requirements:
- Square canvas (1:1).
- One primary central motif only (e.g., book + checkmark, book + sparkle, or book + gentle smile symbol).
- Minimize tiny details; use bold, clean shapes that remain clear at 48px.
- Flat modern 2D style.
- Solid or very subtle gradient background.
- No text or wordmark in the icon.

Color:
- Base: #0f172a or #f8fafc
- Accents: #2563eb, #f59e0b, #fb7185 (use at most 2–3 colors)
- Prioritize strong contrast and legibility.

Output:
- 1024x1024 PNG (plus one transparent-background version)
- Keep source as a plain square without rounded corners (let OS mask it)
- Keep outer safe margin around 10–16%

Negative prompt:
- overly detailed ornaments, readable text, photorealism, busy background, low contrast, too many competing motifs
```

### 生成後チェック（PWAアイコン最低要件）
- 48px / 64px / 128px に縮小しても主モチーフが判別できる
- 明るい背景・暗い背景の両方で視認できる
- 角丸マスク（iOS/Android想定）で欠けても印象が崩れない
- 文字なしでも「読書」「達成」「やさしさ」のニュアンスが残る
