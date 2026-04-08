import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Camera, Palette, TrendingUp } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "プライバシー自動処理",
    body: "EXIF(位置情報等)は全削除、顔は自動検出してぼかし。公開前に必ずチェック。",
  },
  {
    icon: Palette,
    title: "ブラウザ完結の編集",
    body: "インストール不要。Studioでトリミング・色調補正・フィルタ・透かしまで。",
  },
  {
    icon: Camera,
    title: "合法な写真販売",
    body: "個人利用・商用・拡張商用のライセンスを選んで購入。購入者は原本を直接DL。",
  },
  {
    icon: TrendingUp,
    title: "クリエイター優遇",
    body: "販売額の80%がクリエイター取り分。業界平均(50%前後)より大幅に高い配分。",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-20">
          <Badge variant="outline" className="mb-4">
            Privacy-First Photo Marketplace
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            あなたの写真を、
            <br />
            安心して売れる場所。
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            EXIF削除・顔ぼかし・商用ライセンス販売を一体化した、
            プライバシー配慮型の写真マーケット。
            ブラウザ内編集ツール付きで、スマホの1枚からプロの1枚まで。
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/photos">
              <Button size="lg">写真を探す</Button>
            </Link>
            <Link href="/studio">
              <Button size="lg" variant="outline">
                Studioを試す
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="lg" variant="ghost">
                出品する
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="mb-8 text-2xl font-bold">Alibi が選ばれる理由</h2>
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

      <section className="border-t bg-muted/30">
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold">まずは写真を見てみる</h2>
          <p className="mt-3 text-muted-foreground">
            登録不要でカタログを閲覧可能。購入にはログインが必要です。
          </p>
          <Link href="/photos" className="mt-6 inline-block">
            <Button size="lg">カタログを見る</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
