import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/credits";

export const metadata = { title: "料金プラン" };

const PLANS = [
  {
    name: "Free",
    priceLabel: "¥0 / 月",
    description: "まずは試してみたい方",
    cta: "無料で始める",
    href: "/register",
    features: [
      "月2クレジット(2枚生成)",
      "全テンプレート利用可",
      "チケット日付編集",
    ],
  },
  {
    name: "Pro",
    priceLabel: "¥980 / 月",
    description: "定期的に使う方に",
    highlight: true,
    cta: "Proにアップグレード",
    href: "/register?plan=pro",
    features: [
      "月30クレジット",
      "プレミアムテンプレート利用可",
      "生成優先キュー",
      "チケット日付編集",
      "履歴無期限保存",
    ],
  },
  {
    name: "Unlimited",
    priceLabel: "¥2,980 / 月",
    description: "ヘビーユーザー向け",
    cta: "Unlimitedにする",
    href: "/register?plan=unlimited",
    features: [
      "無制限クレジット",
      "全機能利用可",
      "最優先キュー",
      "一括生成(バッチ)",
      "APIアクセス(将来)",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="container py-16">
      <h1 className="text-center text-4xl font-bold">料金プラン</h1>
      <p className="mt-3 text-center text-muted-foreground">
        1枚ずつ購入もOK。サブスクならもっとお得。
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

      <div className="mt-16">
        <h2 className="text-center text-2xl font-bold">都度購入(クレジットパック)</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CREDIT_PACKS.map((pack, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>{pack.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{pack.priceJpy.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">
                  {pack.credits} クレジット (1枚 ¥{Math.floor(pack.priceJpy / pack.credits)})
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
