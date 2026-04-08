# Pivot Log — From "Alibi Marketplace" to "Privacy-First Photo Marketplace"

> **Date**: 2026-04-08
> **Decision maker**: Product owner (@Kadoshima)
> **Scope**: Complete product repositioning

---

## TL;DR

`Alibi` プロジェクトは、当初 **「アリバイ売買アプリ」** として設計されていたが、
**「プライバシー配慮型の写真マーケット + ブラウザ内編集ツール」** に完全ピボットする。
プロジェクト名 (`alibi`) は開発用コードネームとして維持。

---

## 1. 旧コンセプト (Before)

### 何だったか
フリーランスの在籍確認サポート、サプライズ企画、代理出席などを含む、
**「合法的用途に限定したアリバイ関連サービスのマーケットプレイス」** として実装を開始。

### 実装していたもの
- サービスカタログ(`Service`)・予約(`Booking`)モデル
- KYC 必須化
- 利用目的申告 + 禁止キーワードフィルタ
- 管理者によるサービス事前審査
- 監査ログ(`AuditLog`)
- 特定商取引法・利用規約・禁止事項ページ

### なぜダメだったか
| 問題 | 詳細 |
|---|---|
| **規制リスク** | アリバイ業界は景表法・消費者庁の監視対象で、レピュテーションリスクが高い |
| **決済事業者リスク** | Stripe などの主要決済プロバイダがこの業種を嫌う可能性 |
| **市場がニッチ** | 合法用途に絞るとターゲットが狭く、GTM が困難 |
| **過剰な防御設計** | KYC必須・目的審査・監査ログ…と安全側に倒しすぎて UX を損なう |
| **刺さる価値提案が弱い** | 「合法であること」は差別化にならず、既存代行業者との差別化も薄い |

---

## 2. 新コンセプト (After)

### 何にするか
**プライバシー配慮型の写真マーケットプレイス + ブラウザ内編集ツール**

- 個人クリエイターが自分の写真をアップロードして販売
- 出品前に顔・ナンバープレート・EXIF が自動処理される
- ブラウザ内で完結する編集ツールを提供(非登録者も使える、登録 → 出品への導線)
- 購入者はライセンス(個人用 / 商用)を選んで購入

### なぜこれが良いか
| 観点 | 評価 |
|---|---|
| **合法性** | ✅ 完全合法。Shutterstock / Adobe Stock / PIXTA と同カテゴリ |
| **市場規模** | ✅ 世界のストックフォト市場は年約5,000億円以上、拡大傾向 |
| **差別化** | ✅ 「プライバシー自動処理」は大手でも弱い領域、明確な刺さり |
| **クリエイター獲得** | ✅ 業界平均50%→80%の分配で新規クリエイターを呼べる |
| **決済リスク** | ✅ Stripe も普通に受け入れる業種 |
| **技術的面白み** | ✅ 画像処理・AI検出・Canvas編集と技術スタックが魅力的 |

---

## 3. 何を捨て、何を残すか

### ✅ 残す(再利用)
| 領域 | 具体 |
|---|---|
| 基盤 | Next.js 14 App Router 構成、TypeScript、Tailwind、ESLint/Prettier |
| 認証 | NextAuth (Credentials) + RBAC (`User`, `Account`, `Session`) |
| UI コンポーネント | `button`, `input`, `card`, `textarea`, `badge`, navbar, footer |
| 決済 | Stripe クライアント (`lib/stripe.ts`)、Checkout API、Webhook |
| 管理基盤 | `AuditLog`、管理ダッシュボードのシェル |
| 収益機能 | `Coupon`、サブスクプラン UI、手数料計算、紹介プログラム |
| DevOps | Dockerfile、docker-compose、GitHub Actions CI、Vitest、Playwright |
| Ratelimit | `middleware.ts` のレート制限 |

### ❌ 捨てる(削除 or 無効化)
| ファイル・機能 | 理由 |
|---|---|
| `Service` / `Booking` / `Payout` / `Report` モデル | 予約モデルは不要 |
| `src/app/services/` 配下全部 | サービスカタログは写真カタログに置き換え |
| `src/app/dashboard/bookings/` | 予約詳細ページは購入履歴に置き換え |
| `src/app/api/bookings/`, `src/app/api/services/` | API もリプレース |
| `src/app/admin/services/`, `src/app/admin/payouts/` | 写真審査と売上管理に置き換え |
| `src/app/legal/terms/`, `prohibited/` のアリバイ特化文言 | 写真マーケット向けに書き直し |
| `validators.ts` の `bookingCreateSchema`, `serviceCreateSchema`, 禁止キーワード | 写真アップロード用のバリデータに置き換え |
| `lib/pricing.ts` の Booking 依存 | Photo + License 依存に変更 |
| `prisma/seed.ts` のサービスデータ | 写真デモデータに置き換え |
| `src/app/dashboard/kyc/` | KYC 必須ではなくなるので基本削除(出品者のみ任意) |

### 🆕 新規追加
| 領域 | 具体 |
|---|---|
| モデル | `Photo`, `PhotoAsset`, `License`, `PhotoPurchase`, `Tag`, `PhotoTag` |
| ストレージ | `lib/storage.ts` — S3互換クライアント(開発は MinIO) |
| プライバシー処理 | `lib/privacy.ts` — EXIF削除、顔検出、ぼかし適用 |
| アップロードフロー | `/upload` — ドラッグ&ドロップ → プライバシー処理 → プレビュー → 出品 |
| 写真カタログ | `/photos` — 一覧・検索・タグフィルタ |
| 写真詳細 | `/photos/[id]` — プレビュー・ライセンス選択・購入 |
| ダウンロード | `/api/photos/[id]/download` — 購入者向け署名付きURL |
| 編集ツール | `/studio` — Canvas ベースのクライアント編集ツール |
| ダッシュボード | `/dashboard/sales` (売上), `/dashboard/purchases` (購入履歴) |

---

## 4. 移行戦略

1. **ドキュメント先行** (本ドキュメント含む)
2. **Prisma スキーマの更新** — 旧モデルを削除、新モデルを追加
3. **lib レイヤーの更新** — `validators.ts`, `pricing.ts`, `storage.ts`, `privacy.ts`
4. **API リプレース** — `/api/photos`, `/api/uploads`, `/api/purchases`
5. **UI リプレース** — `/photos`, `/upload`, `/studio`, 新ダッシュボード
6. **旧ページ・API の削除**
7. **シードデータの置き換え**
8. **法的ページ(ToS, Privacy)の書き換え**
9. **テストの更新**
10. **README・ARCHITECTURE の整合確認**

---

## 5. 命名について

プロジェクト名 `alibi` は開発コードネームとして維持する。
ブランド名 (UI 上の表示) は将来的に変更の可能性あり。
現時点では `Alibi Photo Market` として UI 表記。

---

## 6. 参照

- 旧実装のコミット: `71489b0` (`feat: business-ready marketplace implementation`)
- 新実装の起点コミット: このピボット以降のコミット
