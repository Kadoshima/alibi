# Roadmap

> 最終更新: 2026-04-11

---

## Phase 1: フレーム構築 — 完了 ✅

**目的**: 全画面・全API・全遷移が動作するフレームの構築。

### 認証・基盤
- [x] NextAuth (Credentials + JWT)
- [x] UserRole (USER / ADMIN)
- [x] Prisma スキーマ設計
- [x] S3 互換ストレージ (AWS SDK v3 + MinIO/R2/S3)
- [x] レート制限 middleware
- [x] CI/CD (GitHub Actions) + Docker + docker-compose

### AI 顔合成
- [x] `lib/ai.ts` — Replicate API クライアント (face swap, dev stub 付き)
- [x] テンプレートモデル (10カテゴリ, premium 対応)
- [x] `/generate` ページ (テンプレ選択 + 顔選択 + 生成リクエスト)
- [x] `/dashboard/history/[id]` (ポーリング + ダウンロード)
- [x] 生成失敗時のクレジット自動返還

### チケット日付編集
- [x] `/ticket-edit` ページ (Canvas + クリック配置 + DL)
- [x] 領収書・レシート自動ブロック (`lib/content-filter.ts`)

### クレジットシステム
- [x] `lib/credits.ts` (getBalance / spendCredits / addCredits)
- [x] `POST /api/credits/purchase` → Stripe Checkout
- [x] Webhook → addCredits
- [x] 3種パック (5枚, 15枚, 50枚)

### 非同期ジョブキュー
- [x] `Job` モデル + `lib/queue.ts` (DB-backed, SKIP LOCKED)
- [x] `lib/job-handlers.ts` (run_face_swap handler)
- [x] `POST /api/jobs/worker` (Bearer 認証)
- [x] ASYNC_PROCESSING env で sync/async 切替

### 管理
- [x] `/admin` — ダッシュボード (ユーザー数・テンプレ数・生成数・キュー)
- [x] `/admin/templates` — テンプレートCRUD

### ユーザー機能
- [x] `/dashboard` (残高・顔写真数・最近の生成)
- [x] `/dashboard/faces` (顔写真登録・削除)
- [x] `/dashboard/history` (生成履歴一覧)
- [x] 顔写真 DELETE API (S3 クリーンアップ付き)

### 決済・課金
- [x] Stripe Checkout (都度購入)
- [x] `POST /api/subscriptions` (サブスク購入フレーム)
- [x] Webhook handler

### その他
- [x] LP (`/`)
- [x] 料金ページ (`/pricing`)
- [x] 法的ページ (利用規約・プライバシー)
- [x] Seed スクリプト (テンプレ10個 + デモユーザー)
- [x] テスト (validators, content-filter, smoke)

---

## Phase 2: R&D + 品質 — 未着手

**目的**: 実際の AI 推論を接続し、プロダクトとして使えるレベルにする。

### AI (R&D)
- [ ] Replicate モデルの比較検証 (face-swap 品質・速度・コスト)
- [ ] テンプレート画像の撮影 / 調達 / 品質基準策定
- [ ] 合成結果のクオリティチェック自動化
- [ ] 顔写真のバリデーション (正面判定、解像度チェック)

### チケット編集 (R&D)
- [ ] OCR 実装 (Tesseract.js or Google Vision) で日付位置を自動検出
- [ ] フォントマッチング (元のフォントに近い上書き)
- [ ] 背景色サンプリング (上書きエリアの自然な塗りつぶし)

### 品質
- [ ] テストカバレッジ拡充 (lib 層の integration test)
- [ ] エラーハンドリングの統一
- [ ] ローディング UI の改善 (skeleton, optimistic updates)
- [ ] レスポンシブ最適化 (スマホメインの仕上げ)

### サブスク
- [ ] Stripe Subscription 実接続 (Price ID 設定 + invoice.paid Webhook)
- [ ] 月次クレジット自動付与ロジック
- [ ] プラン変更 / キャンセル UI

### インフラ
- [ ] Sentry (エラー監視)
- [ ] Vercel Cron でジョブワーカーを定期実行
- [ ] 本番 S3 / R2 へのデプロイ設定
- [ ] Replicate の本番キー設定

---

## Phase 3: グロース — 未着手

- [ ] SNS シェア機能 (生成結果をワンタップ共有)
- [ ] 紹介プログラム UI
- [ ] OGP / SEO 最適化
- [ ] PWA 化 (ホーム画面起動)
- [ ] メール通知 (生成完了、クレジット残少)
- [ ] AI タグ付け (テンプレ自動カテゴリ分類)
- [ ] プロンプトベース生成 (テンプレなしの自由記述)
- [ ] 多言語対応 (英語)
- [ ] モバイルアプリ (React Native)
