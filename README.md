# Alibi — AI アリバイ素材メーカー

> 「今日○○にいた」を、つくれる。
> サプライズの準備中や断りにくい誘いに使える AI 画像合成 & チケット日付編集ツール。

---

## これは何？

**Alibi** は、自分の顔写真を登録して「映画館にいた」「レストランにいた」などの
AI 合成画像を生成したり、チケットの日付を書き換えたりできるサービスです。

### 主な機能

| 機能 | 説明 |
|---|---|
| AI 顔合成 | テンプレート(映画館、レストラン等)に自分の顔を AI で合成 |
| チケット日付編集 | チケット画像の日付部分をブラウザ上で書き換え |
| テンプレートライブラリ | 場面別ベース画像 10+ カテゴリ |
| 領収書・レシートブロック | OCR + キーワード判定で自動検出 → 脱税防止 |
| クレジットシステム | 都度購入 or サブスク (Free 月2枚 / Pro 月30枚 / Unlimited) |

### 禁止事項
- 領収書・レシート・請求書の加工 (脱税防止)
- 公的書類の偽造
- 犯罪・詐欺目的の利用

---

## 技術スタック

| レイヤー | 採用技術 |
|---|---|
| Framework | Next.js 14 (App Router, RSC) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth (Credentials + JWT) |
| Payments | Stripe Checkout + Webhook |
| AI | Replicate API (face swap モデル) |
| Storage | S3互換 (MinIO / Cloudflare R2 / AWS S3) |
| Content Filter | OCR キーワード判定 |
| UI | Tailwind CSS + Radix UI |
| Queue | DB-backed job queue (Postgres) |
| Testing | Vitest + Playwright |
| DevOps | Docker, docker-compose, GitHub Actions |

---

## セットアップ

```bash
npm install
cp .env.example .env.local
# DATABASE_URL / NEXTAUTH_SECRET / REPLICATE_API_TOKEN を入力

docker compose up -d db minio
npm run prisma:migrate
npm run prisma:seed
npm run dev
# → http://localhost:3000
```

### Seed アカウント

| ロール | メール | パスワード |
|---|---|---|
| Admin | admin@alibi.example.com | admin-password-change-me |
| User | user@alibi.example.com | user-password |

---

## 主要ページ

| パス | 説明 |
|---|---|
| `/` | ホームページ |
| `/generate` | AI顔合成 (テンプレート選択 → 生成) |
| `/ticket-edit` | チケット日付編集 |
| `/pricing` | 料金プラン + クレジットパック |
| `/dashboard` | マイページ (残高・生成履歴) |
| `/dashboard/faces` | 顔写真管理 |
| `/dashboard/history/[id]` | 生成結果詳細 + ダウンロード |
| `/admin` | 管理ダッシュボード |
| `/login`, `/register` | 認証 |

---

## 収益モデル

1. **都度課金**: 5枚 ¥490 / 15枚 ¥980 / 50枚 ¥2,480
2. **サブスク**: Free (月2枚) / Pro ¥980 (月30枚) / Unlimited ¥2,980
3. **プレミアムテンプレート**: 通常1CR → 2CR

---

## ドキュメント

- [`docs/PIVOT.md`](./docs/PIVOT.md) — ピボット履歴 (3回のピボット全記録)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — システム設計
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — ロードマップ

---

## 開発コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # 本番ビルド
npm run typecheck    # 型チェック
npm run lint         # ESLint
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run prisma:migrate
npm run prisma:seed
```

---

© Alibi. All rights reserved.
