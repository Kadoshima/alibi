# Handoff Document — Alibi

> AI アリバイ素材メーカー
> 2026-04-11

---

## 1. これは何か

**Alibi** は、ユーザーが自分の顔写真を使って「○○にいた」風の画像を AI で生成したり、
チケットの日付を書き換えたりできる **B2C SaaS ツール**。

**用途**: サプライズ準備中のカバー、断りにくい誘いの口実。
**禁止**: 領収書・レシート・公的書類の加工(自動ブロック)。

---

## 2. 起動方法

```bash
git clone <repo>
cd alibi
npm install
cp .env.example .env.local
# 最低限: DATABASE_URL + NEXTAUTH_SECRET を設定

docker compose up -d db minio   # Postgres + MinIO
npm run prisma:migrate
npm run prisma:seed
npm run dev
# → http://localhost:3000

# Seed アカウント:
#   admin@alibi.example.com / admin-password-change-me
#   user@alibi.example.com  / user-password (10CR付き)
```

---

## 3. 技術スタック

| 層 | 技術 |
|---|---|
| FW | Next.js 14 App Router |
| 言語 | TypeScript (strict) |
| DB | PostgreSQL + Prisma |
| 認証 | NextAuth (Credentials + JWT) |
| 決済 | Stripe (Checkout + Webhook) |
| AI | Replicate API (face swap) |
| Storage | S3互換 (MinIO / R2 / S3) |
| Queue | DB-backed (Postgres, SKIP LOCKED) |
| UI | Tailwind + Radix UI |
| テスト | Vitest + Playwright |
| CI | GitHub Actions |

---

## 4. ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/login, register   認証
│   ├── generate/                AI顔合成 (テンプレ選択→生成)
│   ├── ticket-edit/             チケット日付編集 (Canvas)
│   ├── dashboard/               マイページ
│   │   ├── faces/               顔写真管理
│   │   └── history/             生成履歴
│   ├── admin/                   管理
│   │   └── templates/           テンプレートCRUD
│   ├── pricing/                 料金プラン
│   ├── api/
│   │   ├── generations/         AI生成API
│   │   ├── face-photos/         顔写真CRUD
│   │   ├── ticket-edit/         チケット編集API
│   │   ├── credits/purchase/    クレジット購入
│   │   ├── subscriptions/       サブスク購入
│   │   ├── templates/           テンプレ一覧
│   │   ├── admin/templates/     テンプレ管理
│   │   ├── payments/webhook/    Stripe Webhook
│   │   └── jobs/worker/         ジョブワーカー
│   ├── legal/                   利用規約・プライバシー
│   └── about, contact, pricing  静的ページ
├── components/
│   ├── ui/                      button, input, card, badge, textarea
│   └── site/                    navbar, footer
├── lib/
│   ├── ai.ts                    Replicate face swap クライアント
│   ├── credits.ts               クレジットシステム
│   ├── content-filter.ts        領収書・レシートブロック
│   ├── queue.ts                 ジョブキュー
│   ├── job-handlers.ts          ジョブハンドラ登録
│   ├── s3.ts                    AWS SDK v3 ラッパー
│   ├── storage.ts               presigned URL + キー管理
│   ├── stripe.ts                Stripe クライアント
│   ├── auth.ts                  NextAuth 設定
│   ├── rbac.ts                  requireUser / requireAdmin
│   ├── prisma.ts                DB クライアント
│   ├── audit.ts                 監査ログ
│   ├── validators.ts            Zod スキーマ
│   ├── utils.ts                 formatJpy, formatDateTime, slugify, cn
│   └── env.ts                   環境変数パーサ
└── middleware.ts                レート制限
```

---

## 5. DB モデル一覧

| モデル | 役割 | 重要カラム |
|---|---|---|
| **User** | ユーザー | role(USER/ADMIN), subscriptionPlan, stripeCustomerId |
| **FacePhoto** | 登録顔写真 | userId, s3Key, bucket |
| **Template** | シーン画像 | category, slug, s3Key, premium, active |
| **Generation** | AI生成結果 | status(QUEUED→PROCESSING→COMPLETED/FAILED), resultS3Key |
| **TicketEdit** | チケット編集 | originalS3Key, newDate |
| **CreditBalance** | 残高 | userId(unique), credits |
| **CreditTransaction** | 増減ログ | amount(+/-), reason(purchase/generation/refund/...) |
| **CreditPurchase** | Stripe購入 | credits, amountJpy, status |
| **Coupon** | 割引 | code, kind(PERCENT/FIXED), 期限 |
| **Job** | 非同期ジョブ | kind, payload, status, attempts |
| **AuditLog** | 監査 | action, target, metadata |
| **AnalyticsEvent** | 分析 | event, props |

---

## 6. 主要フロー

### 6.1 AI 顔合成
1. ユーザーが `/dashboard/faces` で顔写真を登録 (S3 private に保存)
2. `/generate` でテンプレ + 顔を選択
3. `POST /api/generations` → クレジット消費 → Job enqueue
4. Worker が Replicate API を呼び、結果を S3 に保存
5. Generation ステータスが COMPLETED に
6. クライアントがポーリングして presigned URL でダウンロード
7. **失敗時はクレジット自動返還**

### 6.2 チケット日付編集
1. `/ticket-edit` でチケット画像を読み込み
2. ファイル名で領収書チェック → Canvas に描画
3. クリックで日付位置指定 → テキスト入力
4. 「保存」→ `POST /api/ticket-edit` (1CR消費) → Canvas を JPEG DL

### 6.3 クレジット購入
1. `/pricing` でパックを選択
2. `POST /api/credits/purchase` → Stripe Checkout
3. 決済完了 → Webhook → `addCredits()`

---

## 7. 環境変数

```
# 必須
DATABASE_URL           PostgreSQL接続文字列
NEXTAUTH_SECRET        JWT署名用シークレット

# Stripe (決済)
STRIPE_SECRET_KEY      Stripe秘密鍵
STRIPE_WEBHOOK_SECRET  Webhook署名検証用

# S3 (ストレージ)
S3_ENDPOINT            MinIO: http://localhost:9000
S3_ACCESS_KEY          アクセスキー
S3_SECRET_KEY          シークレットキー
S3_PUBLIC_BUCKET       公開バケット名
S3_PRIVATE_BUCKET      非公開バケット名

# AI (Replicate)
REPLICATE_API_TOKEN    Replicate APIキー (未設定ならstub)

# ジョブ
ASYNC_PROCESSING       "true" で非同期化 (デフォルト "false")
JOBS_WORKER_SECRET     Worker認証トークン
```

---

## 8. 現状と課題

### ✅ 完了しているもの (フレーム)
- 全17画面 + 全13 APIエンドポイント
- 認証・認可 (NextAuth + RBAC)
- Stripe 都度購入 + Webhook
- DB-backed ジョブキュー
- Replicate AI クライアント (dev stub 付き)
- 領収書・レシート自動ブロック
- クレジットシステム (消費・返還・購入)
- テンプレートCRUD
- 監査ログ
- Docker + CI/CD

### ⚠️ フレームはあるが実接続・検証が必要なもの

| 項目 | 状態 | 必要な作業 |
|---|---|---|
| **Replicate face swap** | スタブで動作 | `REPLICATE_API_TOKEN` を設定して実モデルで品質検証。モデル選定が最重要R&D |
| **テンプレート画像** | Seed で DB 行のみ | 実画像の撮影/調達 → S3 にアップロード。合成品質はここに強く依存 |
| **Stripe 本番** | テストキーで動作 | 本番キー設定、Webhook URL 登録 |
| **S3 本番** | MinIO で動作 | Cloudflare R2 or AWS S3 のバケット作成 + env 差し替え |
| **サブスク月次更新** | API フレームのみ | Stripe Price ID 設定 + `invoice.paid` Webhook で月次クレジット付与 |
| **OCR (チケット)** | 手動位置指定のみ | Tesseract.js or Google Vision で日付位置を自動提案 |
| **Worker 定期実行** | 手動 POST のみ | Vercel Cron (`vercel.json`) or QStash で 30秒〜1分間隔 |

### ❌ 未実装

| 項目 | 優先度 |
|---|---|
| メール通知 (生成完了) | Medium |
| SNS シェア | Medium |
| OGP / SEO | Medium |
| PWA | Low |
| レスポンシブ仕上げ | High |
| Sentry (エラー監視) | High |
| 多言語 | Low |
| モバイルアプリ | 将来 |

---

## 9. R&D で検証すべきこと

### 9.1 AI モデル選定 (最重要)
Replicate 上のフェイススワップモデルを複数試す:
- `omniedgeio/face-swap` (現在のデフォルト)
- `yan-ops/face_swap`
- `lucataco/instantid` (参照顔からの画像生成、テンプレの人物が不要)

検証ポイント:
- 自然さ (合成感がないか)
- 速度 (10秒以下が理想)
- コスト (1推論あたりの Replicate 課金)
- 失敗率

### 9.2 テンプレート画像の品質
合成がうまくいくテンプレの条件:
- 人物の顔がはっきり正面を向いている
- 照明が自然
- 背景が特定の場所と分かる (映画館のスクリーン、レストランの内装)
- 解像度は 1024x1024 以上が望ましい

### 9.3 チケット日付の自然さ
現状: Canvas でテキストを上書き(ベタ置き)。不自然。

改善案:
1. **OCR で元の日付領域を検出** → 背景色でマスク → 新日付を同フォントで描画
2. **Inpainting** (AI で該当領域を消して再生成)
3. **フォントマッチング** (元のフォントに近いフォントを選定して上書き)

---

## 10. コミット履歴

| Hash | 内容 |
|---|---|
| `038f451` | Initial commit (README のみ) |
| `71489b0` | Pivot #0: アリバイマーケット (Service/Booking) |
| `8a810c5` | Pivot #1: 写真マーケット (Photo/PhotoPurchase) |
| `0a034fa` | S3 + sharp 画像処理パイプライン |
| `c97a63e` | 顔検出 + ジョブキュー + Stripe Connect + 写真審査 |
| `f1fddd5` | **Pivot #2: AI アリバイメーカー** (現在のプロダクト) |
| `589ae99` | フレーム完成 (admin/templates, history, subscriptions, refunds) |

---

## 11. 関連ドキュメント

| ファイル | 内容 |
|---|---|
| `README.md` | プロジェクト概要・セットアップ・コマンド |
| `docs/ARCHITECTURE.md` | システム設計・データモデル・フロー |
| `docs/ROADMAP.md` | ロードマップ (Phase 1 完了 / Phase 2-3 未着手) |
| `docs/PIVOT.md` | ピボット履歴 (3回のピボットの意思決定記録) |
| `.env.example` | 環境変数一覧 |
