# Roadmap

---

## Phase 1: MVP (現在進行中)

**目的**: 写真のアップロード→プライバシー処理→購入→ダウンロードの一連のフローを最小構成で成立させる。

### データ層
- [x] Prisma スキーマをフォト向けに再設計
  - `Photo`, `PhotoAsset`, `PhotoPurchase`, `Tag`, `PhotoTag`, `Earning`
- [x] 旧 `Service` / `Booking` / `Payout` / `Report` モデルを削除
- [x] Seed スクリプトを写真デモデータ用に書き直し

### バックエンド
- [x] `lib/storage.ts` — S3 ラッパー(presigned URL + バケット/キー管理)
- [x] `lib/s3.ts` — AWS SDK v3 クライアント(MinIO/R2/S3 共通)
- [x] `lib/processing.ts` — EXIF剥ぎ+ぼかし合成+サムネ生成パイプライン
- [x] `lib/privacy.ts` — プライバシー関連の共通ヘルパ
- [x] `lib/pricing.ts` — ライセンス倍率ベースの価格計算
- [x] `lib/validators.ts` — 写真アップロード用 Zod スキーマ
- [x] `POST /api/uploads/init` — presigned URL 発行
- [x] `POST /api/photos` — パイプライン起動 → PhotoAsset 作成
- [x] `GET /api/photos` — 一覧 API(フィルタ・検索対応)
- [x] `POST /api/purchases` — 購入作成 → Stripe Checkout
- [x] `POST /api/purchases/:id/download` — 購入者向け署名付き URL
- [x] Stripe Webhook を購入モデル(Earning台帳)に対応

### フロントエンド
- [x] ホームページ(新コンセプト)
- [ ] `/photos` — カタログ(タグ・キーワード検索・ソート)
- [ ] `/photos/[id]` — 詳細(プレビュー・ライセンス選択・購入)
- [ ] `/upload` — アップロード→プレビュー→編集→出品のフロー
- [ ] `/studio` — ブラウザ内編集ツール(MVP機能)
- [ ] `/dashboard/purchases` — 購入履歴とダウンロード
- [ ] `/dashboard/uploads` — 出品した写真の管理
- [ ] `/dashboard/sales` — クリエイター売上ダッシュボード

### 管理
- [ ] `/admin/photos` — 出品審査画面
- [ ] `/admin/analytics` — 写真向け分析に書き直し

### 法的
- [ ] 利用規約を写真マーケット向けに書き直し
- [ ] プライバシーポリシー更新
- [ ] ライセンス条項ページ追加

### DevOps
- [x] Docker compose に MinIO を追加(バケット自動作成)
- [x] `.env.example` を更新(S3 / R2 / MinIO 変数)
- [x] `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `sharp` を package.json に追加

---

## Phase 2: 成長期 (0→1 の後の 1→10)

**目的**: 取扱高を増やし、リピート率を上げる。

- [ ] AI タグ付け(Claude API で画像説明 → タグ提案)
- [ ] レコメンド機能(類似写真・おすすめクリエイター)
- [ ] サブスクリプション課金 (Pro / Business)
- [ ] 高度編集ツール(レイヤー、マスク、フィルタ合成)
- [ ] クリエイター向け分析ダッシュボード
- [ ] メール通知(購入・売上・レビュー)
- [ ] お気に入り・コレクション機能
- [ ] 紹介プログラム UI の改善
- [ ] クーポン自動配布(新規登録時)
- [ ] SEO 強化(構造化データ、サイトマップ、OGP)

---

## Phase 3: スケール期

**目的**: グローバル展開・法人取込・収益多様化。

- [ ] Stripe Connect によるクリエイター自動送金
- [ ] API 提供(法人向け B2B 販路)
- [ ] モバイルアプリ(React Native)
- [ ] 多言語対応(英語 → 中国語 → 韓国語)
- [ ] 動画対応
- [ ] AI 生成画像のマーケット拡張
- [ ] ホワイトラベル提供(他社 EC に埋め込み)
- [ ] NFT / Web3 連携(必要に応じて)
- [ ] ISMS / Pマーク取得

---

## 技術的負債 & 要改善項目

- [ ] 顔検出を AWS Rekognition / Google Vision に切り替え
- [ ] 画像処理の非同期ジョブ化 (BullMQ / Inngest)
- [ ] レート制限の Redis 化
- [ ] 観測性(Sentry, OpenTelemetry)
- [ ] フルテストカバレッジ(現状スモーク中心)

---

## KPI (OKR)

**Phase 1 終了条件**:
- MVP 全機能が動作
- デモアカウントで一連のフロー(アップロード→購入→ダウンロード)が完了
- Playwright E2E が全パス

**Phase 2 目標** (ピボットから3ヶ月):
- 月間アップロード写真数: 1,000枚
- 月間購入数: 100件
- 月間GMV: ¥100万

**Phase 3 目標** (ピボットから1年):
- 月間GMV: ¥1,000万
- 月間アクティブクリエイター: 500人
- プラットフォーム収益: ¥200万/月
