import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export const metadata = { title: "料金プラン" };

const PLANS = [
  {
    name: "Free",
    priceLabel: "¥0 / 月",
    description: "個人の利用・試用に",
    cta: "無料で始める",
    href: "/register",
    features: [
      "写真の閲覧・購入",
      "Studio(基本編集)の無料利用",
      "月5枚までの出品",
      "販売手数料 20%",
    ],
  },
  {
    name: "Pro",
    priceLabel: "¥980 / 月",
    description: "本格的にクリエイター活動したい方に",
    highlight: true,
    cta: "Proにアップグレード",
    href: "/register?plan=pro",
    features: [
      "出品無制限",
      "販売手数料 20% → 15%",
      "Studio の高度編集機能",
      "AI タグ付け",
      "売上詳細分析",
      "紹介プログラム報酬 +5%",
    ],
  },
  {
    name: "Business",
    priceLabel: "¥4,980 / 月",
    description: "チーム・法人向け",
    cta: "詳細を問い合わせる",
    href: "/contact",
    features: [
      "Pro の全機能",
      "カスタム手数料率",
      "API アクセス",
      "チームメンバー管理",
      "専任サポート",
      "SLA",
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
