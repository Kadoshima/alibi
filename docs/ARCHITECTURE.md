# Architecture

> Alibi — AI アリバイ素材メーカーのシステム設計ドキュメント
>
> 最終更新: 2026-04-11

---

## 1. システム全体像

```
┌──────────────────────────────────────────────────┐
│                  Browser (Mobile-first)            │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │ /generate │ │/ticket-   │ │  /dashboard/*    │ │
│  │ (AI合成)  │ │ edit      │ │  (顔・履歴・残高) │ │
│  └─────┬────┘ └─────┬─────┘ └────────┬─────────┘ │
└────────┼────────────┼────────────────┼────────────┘
         │            │                │
         ▼            ▼                ▼
┌──────────────────────────────────────────────────┐
│              Next.js 14 (App Router)              │
│  ┌──────────────────────────────────────────┐    │
│  │             API Routes                    │    │
│  │  /generations  /face-photos  /ticket-edit │    │
│  │  /credits      /subscriptions /templates  │    │
│  └──────────┬───────────┬───────────┬────────┘   │
│             │           │           │             │
│  ┌──────────┴───────────┴───────────┴────────┐   │
│  │          lib/ (Business Logic)             │   │
│  │  ai | credits | queue | content-filter     │   │
│  │  s3 | storage | audit | validators         │   │
│  └──────┬───────────┬──────────┬─────────────┘   │
└─────────┼───────────┼──────────┼──────────────────┘
          │           │          │
   ┌──────▼──┐  ┌─────▼────┐ ┌──▼─────┐
   │Postgres │  │S3 / MinIO│ │Stripe  │
   │(Prisma) │  │  / R2    │ │  API   │
   └─────────┘  └──────────┘ └────────┘
                      │
               ┌──────▼──────┐
               │ Replicate   │
               │ (face swap) │
               └─────────────┘
```

---

## 2. データモデル

### 2.1 ER 概要

```
User
  ├── FacePhoto[]       (登録した顔写真、最大5枚)
  ├── Generation[]      (AI生成リクエスト・結果)
  ├── TicketEdit[]      (チケット日付編集)
  ├── CreditBalance     (クレジット残高)
  ├── CreditTransaction[] (クレジット増減ログ)
  └── AuditLog[]

Template                (管理者が登録するシーン画像)
  └── Generation[]

CreditPurchase          (Stripe都度購入)
Coupon                  (割引)
Job                     (非同期ジョブキュー)
AnalyticsEvent          (分析)
```

### 2.2 主要テーブル

| テーブル | 役割 |
|---|---|
| `User` | 認証・プラン・Stripe顧客ID。UserRole は USER / ADMIN |
| `FacePhoto` | ユーザーのセルフィー。S3 の private バケットに保存 |
| `Template` | シーン別ベース画像 (10カテゴリ)。管理者が S3 にアップして DB 登録 |
| `Generation` | AI合成リクエスト。QUEUED → PROCESSING → COMPLETED / FAILED |
| `TicketEdit` | チケット日付編集の記録 |
| `CreditBalance` | ユーザーごとの残高 (1 row per user) |
| `CreditTransaction` | 全ての増減 (purchase, generation, ticket_edit, refund, bonus) |
| `CreditPurchase` | Stripe 決済で購入されたパック。Webhook で PAID に遷移 |
| `Coupon` | 割引コード (PERCENT / FIXED, 期限・上限あり) |
| `Job` | DB-backed 非同期ジョブ (PENDING → RUNNING → COMPLETED / FAILED) |
| `AuditLog` | 管理操作・重要イベントの監査ログ |
| `AnalyticsEvent` | プロダクト分析イベント |

---

## 3. AI 顔合成パイプライン

```
[Client: /generate]
  │ 1. テンプレート + 顔写真を選択
  │ 2. POST /api/generations
  ▼
[Server]
  │ 3. CreditBalance から消費 (1 or 2CR, atomic)
  │ 4. Generation レコードを QUEUED で作成
  │ 5. Job キューに "run_face_swap" を enqueue
  │ 6. 即座にレスポンス { id, jobId, status: "QUEUED" }
  ▼
[Worker: POST /api/jobs/worker]
  │ 7. claimNext() で Job を取得 (FOR UPDATE SKIP LOCKED)
  │ 8. Template + FacePhoto の presigned URL を発行
  │ 9. Replicate API にフェイススワップを投げる
  │    (dev: REPLICATE_API_TOKEN 未設定ならスタブ)
  │ 10. 結果画像を S3 private に保存
  │ 11. Generation を COMPLETED に更新
  │ ※ 失敗時: FAILED に更新 + クレジット自動返還
  ▼
[Client: /dashboard/history/[id]]
  │ 12. ポーリング (3秒間隔) で GET /api/generations/[id]
  │ 13. COMPLETED → presigned GET URL でダウンロード
```

### AI モデル
- デフォルト: `omniedgeio/face-swap` (Replicate)
- `REPLICATE_MODEL` env で差し替え可能
- 推論時間: 通常 10〜30 秒

### 失敗時のクレジット返還
`job-handlers.ts` で AI 失敗 / S3 保存失敗時に `addCredits()` を呼び、
`CreditTransaction(reason: "refund")` + `AuditLog(CREDITS_REFUNDED)` を記録。

---

## 4. チケット日付編集

```
[Client: /ticket-edit]
  1. ユーザーがチケット画像を読み込み (ドラッグ&ドロップ or クリック)
  2. ファイル名チェック (content-filter.ts): 領収書っぽい名前ならブロック
  3. Canvas 上にチケットを描画
  4. ユーザーがクリックして日付配置位置を指定
  5. 新日付テキスト + フォントサイズ + 色を入力
  6. Canvas にリアルタイムでオーバーレイ描画
  7. 「保存」→ POST /api/ticket-edit (1CR消費) → Canvas を JPEG ダウンロード
```

### 領収書・レシートブロック (`lib/content-filter.ts`)
- **ファイル名チェック**: "receipt", "invoice", "領収", "レシート", "請求" を含むファイル名は即拒否
- **OCR テキストチェック**: 30+ キーワード (日英)、2つ以上マッチで拒否
- 将来的には画像分類モデルに差し替え可能

---

## 5. クレジットシステム

### 価格体系

| 区分 | 内容 | 価格 |
|---|---|---|
| Free プラン | 月2CR | ¥0 |
| Pro プラン | 月30CR | ¥980/月 |
| Unlimited | 無制限 | ¥2,980/月 |
| 5枚パック | 5CR | ¥490 |
| 15枚パック | 15CR | ¥980 |
| 50枚パック | 50CR | ¥2,480 |

### 消費単位
- 通常テンプレート: 1CR
- プレミアムテンプレート: 2CR
- チケット日付編集: 1CR

### トランザクション安全性
`spendCredits()` は Prisma `$transaction` 内で:
1. `CreditBalance` の残高チェック
2. `decrement` で引き落とし
3. `CreditTransaction` にログ

残高不足なら `false` を返し、呼び出し元が 402 を返す。

---

## 6. 認証・認可

| Role | できること |
|---|---|
| `USER` | 全ユーザー機能 (生成・チケット編集・購入) |
| `ADMIN` | 上記 + テンプレート管理・監査ログ閲覧 |

NextAuth (Credentials + JWT)。セッション情報に `id` と `role` を含む。

---

## 7. ストレージ設計

```
alibi-private/              (非公開: presigned URL のみ)
  ├── faces/{userId}/{id}.jpg   (登録顔写真)
  └── generations/{genId}.jpg   (AI生成結果)

alibi-public/               (CDN / 公開)
  ├── templates/{slug}.jpg      (テンプレートフル画像)
  └── templates/thumbs/{slug}.webp (サムネイル)
```

S3 互換: AWS SDK v3 + `forcePathStyle: true` で MinIO / R2 / S3 すべて対応。

---

## 8. 非同期ジョブキュー

DB (Postgres) 駆動の軽量キュー。Redis 不要。

- `enqueue()` → Job INSERT
- `claimNext()` → `FOR UPDATE SKIP LOCKED` で原子的クレイム
- 失敗時は `30 * 2^attempts` 秒の指数バックオフ
- `maxAttempts` (デフォルト3) 超過で FAILED 確定
- `POST /api/jobs/worker` (Bearer 認証) を Cron / QStash で定期呼び出し
- `ASYNC_PROCESSING=true` で生成を非同期化 (デフォルト: inline 同期)

---

## 9. Stripe 決済

### 都度購入 (CreditPurchase)
1. `POST /api/credits/purchase` → Stripe Checkout (mode: payment)
2. Webhook `checkout.session.completed` → `addCredits()` + CreditPurchase を PAID に

### サブスク (準備中)
1. `POST /api/subscriptions` → Stripe Checkout (mode: subscription)
2. Webhook で `invoice.paid` → 月次クレジット付与 (未実装、フレームのみ)
3. `STRIPE_PRICE_PRO` / `STRIPE_PRICE_UNLIMITED` env で Price ID を設定

---

## 10. セキュリティ

- `middleware.ts`: API 全体に 120 req/min のレート制限 (IP ベース)
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Prisma パラメータ化クエリ (SQL Injection 防止)
- S3 presigned URL は 5分有効
- CSRF は NextAuth 標準
- 領収書・レシートの自動ブロック (content-filter.ts)
