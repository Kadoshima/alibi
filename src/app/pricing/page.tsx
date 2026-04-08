import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export const metadata = { title: "料金プラン" };

const PLANS = [
  {
    name: "Free",
    priceJpy: 0,
    priceLabel: "¥0 / 月",
    description: "個人利用の基本プラン",
    cta: "無料で始める",
    href: "/register",
    features: [
      "サービス予約（都度課金）",
      "本人確認（KYC）",
      "基本サポート",
    ],
  },
  {
    name: "Pro",
    priceJpy: 4980,
    priceLabel: "¥4,980 / 月",
    description: "プロバイダ・ヘビーユーザー向け",
    highlight: true,
    cta: "Proにアップグレード",
    href: "/register?plan=pro",
    features: [
      "マーケットプレイス手数料 20% → 12%",
      "サービス登録数 無制限",
      "優先サポート",
      "紹介プログラム報酬 15%（Free: 10%）",
      "売上分析ダッシュボード",
    ],
  },
  {
    name: "Enterprise",
    priceJpy: null,
    priceLabel: "お問い合わせ",
    description: "企業・大量取引向け",
    cta: "問い合わせる",
    href: "/contact",
    features: [
      "カスタム手数料率",
      "専任カスタマーサクセス",
      "SLA保証",
      "APIアクセス",
      "社内承認フロー連携",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="container py-16">
      <h1 className="text-center text-4xl font-bold">料金プラン</h1>
      <p className="mt-3 text-center text-muted-foreground">
        ご利用スタイルに合わせて最適なプランをお選びください。
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card
            key={p.name}
            className={p.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{p.name}</CardTitle>
              <div className="text-3xl font-bold">{p.priceLabel}</div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={p.href}>
                <Button className="w-full" variant={p.highlight ? "default" : "outline"}>
                  {p.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
