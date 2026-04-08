import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "売上分析" };

export default async function AnalyticsPage() {
  await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [mtd, prev, lifetime, topServices, funnel] = await Promise.all([
    prisma.booking.aggregate({
      where: { createdAt: { gte: monthStart }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { totalJpy: true, platformFeeJpy: true },
      _count: true,
    }),
    prisma.booking.aggregate({
      where: {
        createdAt: { gte: prevMonthStart, lt: monthStart },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      _sum: { totalJpy: true, platformFeeJpy: true },
      _count: true,
    }),
    prisma.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { totalJpy: true, platformFeeJpy: true },
      _count: true,
    }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _sum: { totalJpy: true },
      _count: true,
      orderBy: { _sum: { totalJpy: "desc" } },
      take: 5,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["event"],
      _count: true,
      orderBy: { _count: { event: "desc" } },
      take: 10,
    }),
  ]);

  const topServiceIds = topServices.map((t) => t.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: topServiceIds } },
    select: { id: true, title: true },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s.title]));

  const gmv = mtd._sum.totalJpy ?? 0;
  const revenue = mtd._sum.platformFeeJpy ?? 0;
  const prevGmv = prev._sum.totalJpy ?? 0;
  const growth = prevGmv === 0 ? null : ((gmv - prevGmv) / prevGmv) * 100;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">売上分析</h1>
      <p className="text-muted-foreground">GMV・プラットフォーム収益・成長率</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">当月GMV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJpy(gmv)}</div>
            <div className="text-xs text-muted-foreground">{mtd._count} 件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">当月プラットフォーム収益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatJpy(revenue)}</div>
            <div className="text-xs text-muted-foreground">手数料合計</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">前月比成長率</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                growth === null ? "" : growth >= 0 ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {growth === null ? "—" : `${growth.toFixed(1)}%`}
            </div>
            <div className="text-xs text-muted-foreground">前月GMV: {formatJpy(prevGmv)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">累計GMV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatJpy(lifetime._sum.totalJpy ?? 0)}</div>
            <div className="text-xs text-muted-foreground">
              累計収益: {formatJpy(lifetime._sum.platformFeeJpy ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">トップサービス</h2>
        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">サービス</th>
                <th className="p-2 text-right">GMV</th>
                <th className="p-2 text-right">予約数</th>
              </tr>
            </thead>
            <tbody>
              {topServices.map((t) => (
                <tr key={t.serviceId} className="border-t">
                  <td className="p-2">{serviceMap.get(t.serviceId) ?? t.serviceId}</td>
                  <td className="p-2 text-right">{formatJpy(t._sum.totalJpy ?? 0)}</td>
                  <td className="p-2 text-right">{t._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">イベントファネル</h2>
        <div className="mt-3 rounded border p-4 text-sm">
          {funnel.map((f) => (
            <div key={f.event} className="flex items-center justify-between border-b py-1 last:border-0">
              <span className="font-mono text-xs">{f.event}</span>
              <span>{f._count}</span>
            </div>
          ))}
          {funnel.length === 0 && <p className="text-muted-foreground">データがありません</p>}
        </div>
      </section>
    </div>
  );
}
