# Alibi

> 合法的なアリバイ関連サービスのマーケットプレイス
> Legally-compliant alibi services marketplace.

## 概要

Alibiは、グレーな印象を持たれがちな「アリバイ業界」を、**審査制・合法性第一・透明性**の3原則で再定義した日本市場向けマーケットプレイスです。

### 主要なユースケース

| カテゴリ | 説明 |
| --- | --- |
| 在籍確認サポート | フリーランスの賃貸契約等に伴う在籍確認の事務代行（実態ベース） |
| サプライズ企画 | 誕生日・結婚記念日などのスケジュール調整 |
| 代理出席 | 主催者承諾のある冠婚葬祭代理出席 |
| プライバシー相談 | ストーカー・DV被害者向けの相談 |

**禁止**: 配偶者欺瞞、雇用主詐欺、行政虚偽申告など。予約時の目的申告＋キーワード審査＋管理者審査で排除。

## テクノロジースタック

- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript
- **DB**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth (Credentials + JWT)
- **Payments**: Stripe Checkout + Webhook
- **UI**: Tailwind CSS + Radix UI primitives
- **Validation**: Zod
- **Tests**: Vitest (unit) + Playwright (E2E)
- **CI/CD**: GitHub Actions + Docker

## プロジェクト構成

```
src/
├── app/
│   ├── (auth)/          # ログイン・登録
│   ├── admin/           # 管理ダッシュボード・審査・分析・入金管理・クーポン
│   ├── api/             # REST APIエンドポイント
│   ├── dashboard/       # ユーザーのマイページ
│   ├── legal/           # 利用規約・プライバシー・禁止事項
│   ├── services/        # サービス一覧・詳細・予約フロー
│   ├── pricing/         # サブスクリプションプラン
│   └── ...
├── components/          # UI コンポーネント
├── lib/                 # prisma, auth, rbac, pricing, audit...
└── middleware.ts        # レート制限
prisma/
├── schema.prisma        # データモデル
└── seed.ts              # 初期データ
tests/
├── unit/                # Vitest
└── e2e/                 # Playwright
```

## セットアップ

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# DATABASE_URL / NEXTAUTH_SECRET / STRIPE_* を入力

# DB 起動 (Docker)
docker compose up -d db

# マイグレーション & シード
npm run prisma:migrate
npm run prisma:seed

# 開発サーバー
npm run dev
```

## Seed アカウント

| ロール | メール | パスワード |
| --- | --- | --- |
| Admin | admin@alibi.example.com | admin-password-change-me |
| Provider | provider@alibi.example.com | provider-password |
| Customer | customer@alibi.example.com | customer-password |

## 主要な収益構造

1. **マーケットプレイス手数料**: 予約金額の 20%（デフォルト、プロバイダ単位で調整可能）
2. **サブスクリプション**: Free / Pro (月額 ¥4,980 / 手数料 12%) / Enterprise
3. **紹介プログラム**: 手数料の 10% を紹介者に還元
4. **クーポン**: 新規獲得用の割引クーポンを管理画面から発行可能
5. **エスクロー**: 顧客決済 → 完了確認 → プロバイダ入金のフロー
6. **アナリティクス**: GMV・手数料収益・成長率・トップサービス・イベントファネル可視化

## 開発コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # 本番ビルド
npm run typecheck    # 型チェック
npm run lint         # ESLint
npm run test         # Vitest 単体テスト
npm run test:e2e     # Playwright E2E
npm run prisma:migrate
npm run prisma:seed
```

## Docker デプロイ

```bash
docker compose up --build
```

## 法的対応

- 利用規約 (`/legal/terms`)
- プライバシーポリシー (`/legal/privacy`)
- 禁止事項ガイドライン (`/legal/prohibited`)
- 特定商取引法に基づく表記 (`/about#company`)
- 全ての予約は監査ログに記録 (`AuditLog` モデル)

## ロードマップ

- [ ] KYC 外部プロバイダ連携（Onfido, SourceID 等）
- [ ] プロバイダ Stripe Connect 自動送金
- [ ] メール送信（SendGrid / Resend）
- [ ] 多言語対応（英語）
- [ ] モバイルアプリ（React Native）
- [ ] AI による利用目的の自動審査（Claude API）

---

© Alibi Platform. All rights reserved.
