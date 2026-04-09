# Alibi — Privacy-First Photo Marketplace

> 自分の写真を、プライバシーに配慮して、安全に売買できるマーケットプレイス。
> ブラウザ内で完結する編集ツール付き。

---

## 🎯 これは何？

**Alibi** は、個人クリエイターがスマホやカメラで撮った写真を、
**プライバシー自動処理 → 編集 → 出品 → 販売** までワンストップで行えるマーケットプレイスです。

### 3つの特徴

| # | 特徴 | 具体的な差別化 |
|---|---|---|
| 1 | **プライバシー自動処理** | 顔・ナンバープレート・EXIF(位置情報等)を自動で検出・マスキング・削除 |
| 2 | **ブラウザ完結の編集ツール** | トリミング・明るさ・フィルタ・透かしをインストール不要で |
| 3 | **クリエイター優遇の収益分配** | 販売額の80%がクリエイター取り分。大手(50%前後)より大幅に高い |

### ユースケース

- 📸 **個人クリエイター**: スマホで撮った写真を副収入に
- 🎨 **プロの写真家**: プロ向け編集＋プライバシー処理を一体化
- 🏢 **中小企業・ブロガー**: ストック写真を合法的にライセンス購入
- 🔐 **プライバシー重視ユーザー**: 友人の顔や自宅位置を消してからSNS投稿

---

## 🏗️ 技術スタック

| レイヤー | 採用技術 |
|---|---|
| Framework | Next.js 14 (App Router, RSC, Server Actions) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth (Credentials + JWT) |
| Payments | Stripe Checkout + Webhook |
| Storage | S3 互換 (開発は MinIO / 本番は Cloudflare R2 or AWS S3) |
| Image Processing | `sharp` (サーバー) + Canvas API (クライアント) |
| Face Detection | `@vladmandic/face-api` (MVP) → 本番は AWS Rekognition 等 |
| UI | Tailwind CSS + Radix UI |
| Validation | Zod |
| Testing | Vitest (unit) + Playwright (E2E) |
| DevOps | Docker, docker-compose, GitHub Actions |

---

## 📁 ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/              # ログイン・登録
│   ├── admin/               # 管理ダッシュボード・売上分析・審査
│   ├── api/                 # REST API エンドポイント
│   │   ├── photos/          # 写真の CRUD
│   │   ├── uploads/         # 署名付きアップロードURL発行
│   │   ├── purchases/       # 購入処理
│   │   └── payments/        # Stripe 決済・Webhook
│   ├── dashboard/           # マイページ(売上・購入履歴・アップロード)
│   ├── photos/              # 写真カタログ・詳細・購入
│   ├── studio/              # ブラウザ内編集ツール
│   ├── upload/              # アップロード & プライバシー処理フロー
│   ├── pricing/             # サブスクリプションプラン
│   └── legal/               # 利用規約・プライバシー
├── components/              # UI コンポーネント
│   ├── ui/                  # プリミティブ(button, input, card, ...)
│   ├── editor/              # 画像編集ツール
│   └── site/                # navbar, footer
├── lib/                     # 共通ロジック
│   ├── prisma.ts            # DB クライアント
│   ├── auth.ts              # NextAuth 設定
│   ├── rbac.ts              # 権限制御
│   ├── storage.ts           # S3 クライアント
│   ├── privacy.ts           # プライバシー処理パイプライン
│   ├── pricing.ts           # 価格・手数料計算
│   ├── stripe.ts            # Stripe クライアント
│   ├── audit.ts             # 監査ログ
│   └── validators.ts        # Zod スキーマ
└── middleware.ts            # レート制限

prisma/
├── schema.prisma            # データモデル
└── seed.ts                  # 初期データ

tests/
├── unit/                    # Vitest 単体テスト
└── e2e/                     # Playwright E2E テスト

docs/
├── ARCHITECTURE.md          # システム設計
├── PIVOT.md                 # ピボット履歴と理由
└── ROADMAP.md               # ロードマップ
```

---

## 💰 収益モデル

1. **販売手数料 (20%)** — メイン収益
   - 販売額の80%がクリエイター、20%がプラットフォーム
   - 業界平均(50%前後)と比較して大幅にクリエイター有利

2. **サブスクリプション**
   - **Free**: 月5枚まで出品、基本編集ツール
   - **Pro (¥980/月)**: 出品無制限、高度な編集、手数料15%に軽減、AIタグ付け
   - **Business (¥4,980/月)**: チーム機能、APIアクセス、カスタムライセンス

3. **クーポン・紹介プログラム**
   - 新規購入者向け割引クーポン
   - 紹介者に手数料の10%を還元

4. **将来的な追加収益**
   - AI 生成画像の生成課金
   - NFT / Web3 連携
   - 法人向けライセンスBPO

詳細は [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) と [`docs/ROADMAP.md`](./docs/ROADMAP.md) 参照。

---

## 🚀 セットアップ

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# DATABASE_URL / NEXTAUTH_SECRET / S3_* / STRIPE_* を入力

# PostgreSQL と MinIO を起動
docker compose up -d db minio

# DB マイグレーション & シード
npm run prisma:migrate
npm run prisma:seed

# 開発サーバー
npm run dev
# → http://localhost:3000
```

### Seed アカウント

| ロール | メール | パスワード |
|---|---|---|
| Admin | admin@alibi.example.com | admin-password-change-me |
| Creator | creator@alibi.example.com | creator-password |
| Buyer | buyer@alibi.example.com | buyer-password |

---

## 🛠️ 開発コマンド

```bash
npm run dev              # 開発サーバー
npm run build            # 本番ビルド
npm run typecheck        # 型チェック
npm run lint             # ESLint
npm run test             # Vitest 単体テスト
npm run test:e2e         # Playwright E2E
npm run prisma:migrate   # マイグレーション実行
npm run prisma:seed      # シード投入
npm run format           # Prettier
```

---

## 🗺️ ロードマップ

**Phase 1 (MVP)** — 完了
- [x] 認証・ユーザー管理
- [x] Stripe 決済 + Webhook(Earning台帳)
- [x] 管理ダッシュボード
- [x] 写真アップロード & S3 保存(AWS SDK v3, MinIO/R2/S3対応)
- [x] プライバシー自動処理パイプライン(EXIF剥ぎ・ぼかし合成・サムネ生成)
- [x] 写真カタログ・購入フロー・購入者ダウンロード(presigned URL)
- [x] ブラウザ内編集ツール(Studio)
- [x] 顔検出の自動化(AWS Rekognition プロバイダ対応)
- [x] 非同期ジョブキュー(DB-backed, `/api/jobs/worker`)
- [x] Stripe Connect によるクリエイター自動送金
- [x] 管理画面での写真審査 (`/admin/photos`)

**Phase 2** — 成長期
- [ ] AI タグ付け・自動カテゴリ
- [ ] サブスクリプション課金
- [ ] 高度編集ツール(レイヤー・マスク)
- [ ] クリエイター向けアナリティクス

**Phase 3** — スケール期
- [ ] API 提供 (法人向け)
- [ ] モバイルアプリ
- [ ] 多言語対応

詳細は [`docs/ROADMAP.md`](./docs/ROADMAP.md) 参照。

---

## 📜 ドキュメント

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — システム設計・データモデル・パイプライン詳細
- [`docs/PIVOT.md`](./docs/PIVOT.md) — ピボット履歴(なぜ方向転換したか、何を捨て何を残したか)
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — 開発ロードマップ

---

## 📄 ライセンス

© Alibi Platform. All rights reserved.
