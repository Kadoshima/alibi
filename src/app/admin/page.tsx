import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "管理ダッシュボード" };

export default async function AdminPage() {
  await requireAdmin();
  const [userCount, serviceCount, pendingServices, bookingCount, reportCount] = await Promise.all([
    prisma.user.count(),
    prisma.service.count(),
    prisma.service.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.booking.count(),
    prisma.report.count({ where: { resolved: false } }),
  ]);

  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { user: { select: { email: true } } },
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">管理ダッシュボード</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">ユーザー</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{userCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">サービス</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{serviceCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">審査待ち</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">
            <Link href="/admin/services">{pendingServices}</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">予約累計</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{bookingCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">未対応通報</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{reportCount}</CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/services" className="text-primary underline">
          サービス審査
        </Link>
        <Link href="/admin/analytics" className="text-primary underline">
          売上分析
        </Link>
        <Link href="/admin/coupons" className="text-primary underline">
          クーポン管理
        </Link>
        <Link href="/admin/payouts" className="text-primary underline">
          入金管理
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">最近の監査ログ</h2>
        <div className="mt-4 overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">日時</th>
                <th className="p-2 text-left">ユーザー</th>
                <th className="p-2 text-left">アクション</th>
                <th className="p-2 text-left">対象</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-2">{log.createdAt.toISOString()}</td>
                  <td className="p-2">{log.user?.email ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{log.action}</td>
                  <td className="p-2 font-mono text-xs">{log.target ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
