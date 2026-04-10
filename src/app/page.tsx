import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Ticket, Sparkles, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Camera,
    title: "AI 顔合成",
    body: "自分の顔写真を登録して、映画館・レストラン・旅行先などの「自分がいた写真」を AI で生成。",
  },
  {
    icon: Ticket,
    title: "チケット日付編集",
    body: "映画・コンサート・スポーツ等のチケット画像の日付だけを変更。※領収書・レシートは不可。",
  },
  {
    icon: Sparkles,
    title: "豊富なテンプレート",
    body: "映画館、飲み会、旅行先、スポーツ観戦…場面別テンプレートでリアルなアリバイ素材を作成。",
  },
  {
    icon: ShieldCheck,
    title: "安心設計",
    body: "領収書・レシートは自動検出してブロック。脱税・犯罪に使えない仕組みで安心。",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-20">
          <Badge variant="outline" className="mb-4">
            AI アリバイ素材メーカー
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            「行ってた」を、
            <br />
            つくれる。
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            サプライズの準備中、断りにくい誘いに。
            自分の顔写真を使った AI 合成画像やチケットの日付編集で、
            自然なアリバイ素材を作れるサービスです。
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/generate">
              <Button size="lg">アリバイを作る</Button>
            </Link>
            <Link href="/ticket-edit">
              <Button size="lg" variant="outline">
                チケットを編集
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            ※ 領収書・レシートの加工は脱税防止のため利用できません
          </p>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="mb-8 text-2xl font-bold">Alibi でできること</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{f.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold">月2枚まで無料</h2>
          <p className="mt-3 text-muted-foreground">
            登録するだけで毎月2クレジットが付与。まずは無料で試してみてください。
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">無料で始める</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                料金プラン
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
