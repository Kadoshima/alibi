import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/credits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "マイページ" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [credits, faceCount, recentGens, recentEdits] = await Promise.all([
    getBalance(user.id),
    prisma.facePhoto.count({ where: { userId: user.id } }),
    prisma.generation.findMany({
      where: { userId: user.id },
      include: { template: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.ticketEdit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">マイページ</h1>
        <div className="flex gap-2">
          <Link href="/generate">
            <Button>AI合成</Button>
          </Link>
          <Link href="/ticket-edit">
            <Button variant="outline">チケット編集</Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">クレジット残高</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <span className="text-3xl font-bold text-primary">{credits}</span>
            <Link href="/pricing">
              <Button size="sm" variant="outline">
                追加購入
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">登録顔写真</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <span className="text-3xl font-bold">{faceCount}</span>
            <Link href="/dashboard/faces">
              <Button size="sm" variant="outline">
                管理
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">プラン</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{user.role === "ADMIN" ? "ADMIN" : "FREE"}</span>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">最近の生成</h2>
        <div className="mt-3 space-y-2">
          {recentGens.length === 0 && (
            <p className="text-sm text-muted-foreground">まだ生成していません</p>
          )}
          {recentGens.map((g) => (
            <Link href={`/dashboard/history/${g.id}`} key={g.id}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <div className="font-medium">{g.template?.title ?? "Custom"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(g.createdAt)}
                    </div>
                  </div>
                  <Badge variant={g.status === "COMPLETED" ? "success" : "secondary"}>
                    {g.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">最近のチケット編集</h2>
        <div className="mt-3 space-y-2">
          {recentEdits.length === 0 && (
            <p className="text-sm text-muted-foreground">まだ編集していません</p>
          )}
          {recentEdits.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-4 text-sm">
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(e.createdAt)} / 新日付: {e.newDate}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
