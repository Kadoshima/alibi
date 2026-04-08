import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "マイページ" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [purchases, uploads, earningsAgg] = await Promise.all([
    prisma.photoPurchase.findMany({
      where: { buyerId: user.id },
      include: { photo: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.photo.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.earning.aggregate({
      where: { userId: user.id, status: "AVAILABLE" },
      _sum: { amountJpy: true },
    }),
  ]);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">マイページ</h1>
          <p className="text-muted-foreground">
            {user.name ?? user.email} さん / ロール: {user.role}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button>写真をアップロード</Button>
          </Link>
          <Link href="/studio">
            <Button variant="outline">編集ツールを開く</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">購入数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{purchases.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">出品数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{uploads.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">未出金売上</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">
            {formatJpy(earningsAgg._sum.amountJpy ?? 0)}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/dashboard/purchases" className="text-primary underline">
          購入履歴・ダウンロード
        </Link>
        <Link href="/dashboard/uploads" className="text-primary underline">
          出品中の写真
        </Link>
        <Link href="/dashboard/sales" className="text-primary underline">
          売上
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">最近の購入</h2>
        <div className="mt-3 space-y-2">
          {purchases.length === 0 && (
            <p className="text-sm text-muted-foreground">購入履歴はまだありません。</p>
          )}
          {purchases.map((p) => (
            <Link href={`/photos/${p.photo.slug}`} key={p.id}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <div className="font-medium">{p.photo.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.licenseKind} / {p.status}
                    </div>
                  </div>
                  <div className="font-bold">{formatJpy(p.grossJpy - p.discountJpy)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
