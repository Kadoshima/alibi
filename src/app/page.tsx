import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Scale, Users, Sparkles } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "合法性第一",
    body: "すべての取引は利用目的の確認・審査を経てから開始されます。禁止用途は厳格に排除します。",
  },
  {
    icon: Scale,
    title: "法令順守",
    body: "特定商取引法・個人情報保護法・景品表示法等に準拠。顧問弁護士による定期的なレビュー体制。",
  },
  {
    icon: Users,
    title: "本人確認済み提供者",
    body: "サービス提供者は全員KYC（本人確認）済み。評価制度で品質を担保します。",
  },
  {
    icon: Sparkles,
    title: "幅広い合法的ユースケース",
    body: "在籍確認サポート、サプライズ企画、代理出席、プライバシー相談など。",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-20">
          <Badge variant="outline" className="mb-4">
            合法的用途限定・審査制プラットフォーム
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            「やむを得ない事情」に、
            <br />
            合法の範囲で寄り添う。
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Alibiは、フリーランスの在籍確認、サプライズ企画、やむを得ない代理出席など、
            合法的かつ倫理的な用途に限定したアリバイ関連サービスを提供するマーケットプレイスです。
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/services">
              <Button size="lg">サービスを探す</Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline">
                私たちの方針を読む
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            ※ 配偶者を欺く目的、犯罪・詐欺を目的とするご利用は禁止しており、審査段階で排除されます。
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="container py-16">
        <h2 className="mb-8 text-2xl font-bold">Alibiが選ばれる理由</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <Card key={h.title}>
              <CardHeader>
                <h.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">{h.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{h.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold">まずはサービスを確認</h2>
          <p className="mt-3 text-muted-foreground">
            登録不要でカタログをご覧いただけます。予約には本人確認とKYCが必要です。
          </p>
          <Link href="/services" className="mt-6 inline-block">
            <Button size="lg">カタログを見る</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
