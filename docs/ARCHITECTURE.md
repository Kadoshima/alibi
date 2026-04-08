# Architecture

> Alibi Photo Market のシステム設計ドキュメント

---

## 1. システム全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐ │
│  │  Catalog   │  │   Upload   │  │    Studio (Canvas Editor)  │ │
│  │   /photos  │  │  /upload   │  │         /studio            │ │
│  └──────┬─────┘  └──────┬─────┘  └─────────────┬──────────────┘ │
│         │               │                       │                │
└─────────┼───────────────┼───────────────────────┼───────────────┘
          │               │                       │
          ▼               ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js (App Router) Server                   │
│  ┌───────────────┐ ┌────────────┐ ┌────────────────────────┐   │
│  │ RSC (Browse)  │ │ API Routes │ │ Server Actions (Mut.)  │   │
│  └───────┬───────┘ └──────┬─────┘ └───────────┬────────────┘   │
│          │                 │                    │                │
│  ┌───────┴─────────────────┴────────────────────┴────────────┐ │
│  │                    lib/ (Business Logic)                  │ │
│  │  storage | privacy | pricing | stripe | rbac | audit      │ │
│  └──────────┬──────────────┬──────────────┬──────────────────┘ │
└─────────────┼──────────────┼──────────────┼─────────────────────┘
              │              │              │
     ┌────────▼──┐     ┌─────▼─────┐   ┌───▼─────┐
     │ Postgres  │     │ S3 / R2 / │   │ Stripe  │
     │ (Prisma)  │     │  MinIO    │   │   API   │
     └───────────┘     └───────────┘   └─────────┘
```

---

## 2. データモデル

### 2.1 コアモデル

```
User ──── owns ──→  Photo ──── has ──→ PhotoAsset (original / masked / thumb)
  │                   │
  │                   ├── has ──→ Tag (many-to-many via PhotoTag)
  │                   │
  │                   └── has ──→ License (PERSONAL / COMMERCIAL / EXTENDED)
  │
  ├── purchases ──→  PhotoPurchase ──→ Payment (Stripe)
  │                        │
  │                        └── downloads ──→ DownloadToken (signed URL)
  │
  └── earnings ──→  Earning (clearing ledger for payouts)
```

### 2.2 テーブル設計のポイント

| テーブル | 役割 | 主なカラム |
|---|---|---|
| `User` | ユーザー(購入者・クリエイター・管理者を role で区別) | email, role, stripeCustomerId, platformFeeBps |
| `Photo` | 写真の論理エンティティ(公開設定・価格・状態) | ownerId, title, status, priceJpy, licenseKind |
| `PhotoAsset` | 1つの Photo に複数存在する物理ファイル | photoId, variant(ORIGINAL/MASKED/THUMB), s3Key, width, height |
| `Tag` | タグマスタ | name, slug |
| `PhotoTag` | Photo ↔ Tag の中間テーブル | photoId, tagId |
| `PhotoPurchase` | 購入レコード(1写真を複数ライセンスで購入可能) | buyerId, photoId, licenseKind, priceJpy, paymentId |
| `Payment` | Stripe 決済の記録 | purchaseId, stripePaymentIntentId, status, amountJpy |
| `Earning` | クリエイターへの支払い原資ledger | userId, amountJpy, source(SALE/REFERRAL), status |
| `Coupon` | 割引クーポン | code, kind, percentBps/valueJpy, 有効期限 |
| `AnalyticsEvent` | プロダクト分析のための生イベントログ | event, userId, props |
| `AuditLog` | セキュリティ・コンプライアンス用の監査ログ | userId, action, target, metadata, ip |

### 2.3 ライセンス設計

3種類の権利を `licenseKind` enum で扱う:

- **PERSONAL** — 個人利用のみ。SNS 投稿、私的な印刷。価格: 標準
- **COMMERCIAL** — 商用利用可。Webサイト、広告、商品パッケージ等。価格: PERSONAL の 3倍
- **EXTENDED** — 再販・テンプレ販売等まで可。価格: COMMERCIAL の 2倍

価格はクリエイターが `Photo.priceJpy`(PERSONAL価格)のみ設定し、COMMERCIAL/EXTENDED はマスタ倍率で自動算出する(MVP)。

---

## 3. プライバシー処理パイプライン

アップロードされた画像は、**全て** プライバシー処理パイプラインを通過する。
パイプラインは `src/lib/processing.ts` の `processPhoto()` で実装されている。

```
[Client]
   │ 1. ユーザーがファイルを選択
   ▼
[POST /api/uploads/init]
   │ 2. presigned PUT URL を発行 (uploads/{userId}/{id}.{ext})
   ▼
[Client → S3/MinIO/R2]
   │ 3. 生ファイルを uploads/ プレフィックスに直接PUT
   ▼
[POST /api/photos]
   │ 4. Photo 行を PROCESSING で作成
   │ 5. processPhoto() を呼び出し:
   │     a. GetObject でアップロードを取得
   │     b. sharp.rotate() + jpeg(95) で EXIF を完全剥ぎ取り (ORIGINAL)
   │     c. approvedBlurRegions[] をぼかし合成 (MASKED)
   │     d. 任意の watermark SVG を overlay
   │     e. 400px WebP サムネイルを生成 (THUMB)
   │     f. 3バリアントを並列 PutObject
   │     g. 一時 uploads/ オブジェクトを DeleteObject
   │ 6. PhotoAsset 3行を書き込み
   │ 7. Photo を PENDING_REVIEW に更新
   │    (privacyExifStripped / privacyFacesCount を記録)
```

### バケット分離

```
alibi-private/                (非公開)
  ├── uploads/{userId}/*.*    (一時: 処理後に削除)
  └── originals/{photoId}.*   (購入者のみ presigned GET で取得)

alibi-public/                 (CDN 配信)
  ├── masked/{photoId}.*      (公開プレビュー、watermark 可)
  └── thumbs/{photoId}.webp   (カタログ用、WebP 400px)
```

### 注意点

- **ORIGINAL は非公開バケット** に保存し、購入者のみが presigned GET URL で取得可能(デフォルト5分有効)。
- **MASKED / THUMB は公開CDN** 配信。カタログ・詳細ページで露出するのはこれ。
- **EXIF は必ず剥ぎ取る**。sharp は明示的にメタデータを渡さない限り剥ぎ取る挙動なので、
  `pipeline.jpeg()` を通すだけで安全。
- **顔検出** は MVP ではクライアント側で手動指定する前提(スタブ)。
  次フェーズで `@vladmandic/face-api` またはクラウド AI(AWS Rekognition)に差し替え予定。
- **パイプラインは冪等**。`photoId` をキーに同じオブジェクトキーを上書きするため、再実行可能。
- **失敗時はエラーを配列で返す** → 呼び出し元が Photo のステータスを DRAFT に戻すなどの判断が可能。

### 注意点

- **ORIGINAL は非公開バケット** に保存する。購入者のみが一時的な署名付きURLで取得可能。
- **MASKED は公開CDN** 配信。カタログ・詳細ページで見えるのはこれ。
- **EXIF は必ず剥ぎ取る**。位置情報事故を防ぐのが最優先。
- **MVP では face-api を使用**。精度が必要になったら AWS Rekognition / Google Vision に切り替える。

---

## 4. 編集ツール (Studio)

`/studio` ルートに Canvas ベースのブラウザ内編集ツールを提供する。

### MVP 機能
- トリミング / リサイズ
- 明るさ / コントラスト / 彩度
- フィルタ(グレースケール、セピア等)
- 透かし追加
- 結果を PNG/JPEG でダウンロード
- **結果をそのまま出品フローへ送信**

### 技術選定
- Canvas 2D API を素で使う(サードパーティ依存を最小化)
- 将来的に Fabric.js / Konva の導入を検討

### 非ログインユーザーも使える
編集ツールは「集客フック」として機能させる。
編集後の保存・出品にはログインが必要 → 自然な登録導線。

---

## 5. 決済フロー

```
[Buyer]
   │ 1. 写真詳細で License を選択して「購入」
   ▼
[Next.js Server]
   │ 2. PhotoPurchase (PENDING) を作成
   │ 3. Stripe Checkout Session を作成
   ▼
[Stripe]
   │ 4. Buyer が決済完了
   ▼
[Next.js Webhook]
   │ 5. checkout.session.completed を受信
   │ 6. PhotoPurchase を PAID に更新
   │ 7. Earning レコードを作成 (creatorShare 80%)
   │ 8. Payment を CAPTURED に更新
   ▼
[Buyer]
   │ 9. ダウンロード画面にリダイレクト
   │ 10. /api/photos/:id/download で署名付きS3 URLを発行
   ▼
[S3]
   │ 11. ORIGINAL (透かしなし) を期間限定配信
```

### 手数料計算

```ts
// Photo.priceJpy は PERSONAL 価格
const multiplier = { PERSONAL: 1, COMMERCIAL: 3, EXTENDED: 6 }[licenseKind];
const grossJpy = Math.floor(photo.priceJpy * multiplier);

const platformFeeBps = creator.platformFeeBps; // デフォルト 2000 = 20%
const platformFeeJpy = Math.floor((grossJpy * platformFeeBps) / 10000);
const creatorEarningsJpy = grossJpy - platformFeeJpy;
```

---

## 6. 認可 (RBAC)

| Role | できること |
|---|---|
| `BUYER` (default) | 写真閲覧・購入・ダウンロード・レビュー・編集ツール利用 |
| `CREATOR` | 上記 + 写真アップロード・出品・売上管理 |
| `ADMIN` | 上記 + 審査・ユーザー管理・分析閲覧 |

- ロール昇格: Buyer が「出品する」ボタンを押すと `CREATOR` にアップグレード(同意画面あり)
- `ADMIN` は DB 直接または CLI で付与

---

## 7. ストレージ設計

### バケット構成

```
alibi-public/         (公開: CDN経由でMASKED/THUMBを配信)
  ├── masked/{photoId}.{ext}
  └── thumbs/{photoId}.webp

alibi-private/        (非公開: 署名付きURL経由のみ)
  └── originals/{photoId}.{ext}
```

### 開発環境
- MinIO を docker-compose で立てる
- 公開バケットと非公開バケットで S3 ポリシーを使い分け

### 本番環境
- Cloudflare R2 (egress 無料) が第一候補
- 代替: AWS S3 + CloudFront

---

## 8. レート制限・セキュリティ

- `middleware.ts` で API 全体に 120 req/min の制限(IP ベース)
- 本番は Upstash Redis または Cloudflare Rate Limiting に差し替え
- CSRF は NextAuth が標準対応
- XSS は React のエスケープに依存、`dangerouslySetInnerHTML` は使わない
- SQL Injection は Prisma のパラメータ化で防止
- S3 直接アップロードは presigned URL で有効期限 5分
- セキュリティヘッダ(HSTS, X-Frame-Options, etc)は `next.config.mjs` で設定済み

---

## 9. 分析・監査

### AnalyticsEvent (プロダクト分析)
ユーザー行動を集計して成長可視化に使う。`lib/analytics.ts` から発火。

主要イベント:
- `photo_viewed`, `photo_uploaded`, `photo_purchased`
- `editor_used`, `editor_saved`
- `signup`, `login`

### AuditLog (コンプライアンス)
権限行使・重要な状態変更を全て記録。管理画面から検索可能。

主要アクション:
- `USER_REGISTERED`, `PHOTO_PUBLISHED`, `PHOTO_PURCHASED`
- `CREATOR_UPGRADED`, `PHOTO_REJECTED`, `REFUND_ISSUED`

---

## 10. テスト戦略

| 層 | ツール | 対象 |
|---|---|---|
| Unit | Vitest | `lib/*` のピュアな関数(pricing, validators, privacy helpers) |
| Integration | Vitest + テストDB | Prisma クエリ、API handlers |
| E2E | Playwright | スモーク(ホーム・カタログ・ログイン・購入フロー) |

CI で全層を実行。

---

## 11. デプロイ

### 推奨構成
- **ホスティング**: Vercel (Next.js の一等地) or Cloud Run
- **DB**: Supabase / Neon / PlanetScale (Postgres)
- **ストレージ**: Cloudflare R2
- **決済**: Stripe (本番モード)
- **監視**: Sentry (エラー) + Vercel Analytics

### 環境変数
`.env.example` 参照。本番は GitHub Actions Secrets に設定。

---

## 12. 既知の制約と将来の改善

- [ ] MVP の顔検出は精度が低い可能性 → AWS Rekognition へ移行
- [ ] 大きい画像の処理は時間がかかる → Background Job (BullMQ/Inngest) 化
- [ ] 現状レビューは単純星評価のみ → 画像品質指標を追加
- [ ] ダウンロードの回数制限ロジックが未実装
- [ ] i18n 未対応(現状日本語のみ)
