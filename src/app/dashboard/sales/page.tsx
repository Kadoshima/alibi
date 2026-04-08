import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy, formatDateTime } from "@/lib/utils";

export const metadata = { title: "売上ダッシュボード" };

export default async function SalesPage() {
  const user = await requireUser();

  const [lifetime, monthly, recent, earnings] = await Promise.all([
    prisma.photoPurchase.aggregate({
      where: { photo: { ownerId: user.id }, status: "PAID" },
      _sum: { grossJpy: true, platformFeeJpy: true, creatorEarningsJpy: true },
      _count: true,
    }),
    (() => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      return prisma.photoPurchase.aggregate({
        where: {
          photo: { ownerId: user.id },
          status: "PAID",
          paidAt: { gte: monthStart },
        },
        _sum: { creatorEarningsJpy: true },
        _count: true,
      });
    })(),
    prisma.photoPurchase.findMany({
      where: { photo: { ownerId: user.id }, status: "PAID" },
      include: { photo: { select: { title: true, slug: true } }, buyer: { select: { name: true } } },
      orderBy: { paidAt: "desc" },
      take: 20,
    }),
    prisma.earning.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="container max-w-5xl py-10">
      <h1 className="text-3xl font-bold">売上ダッシュボード</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">累計販売数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{lifetime._count}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">累計売上(総額)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatJpy(lifetime._sum.grossJpy ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">累計獲得額</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">
            {formatJpy(lifetime._sum.creatorEarningsJpy ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">当月獲得額</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatJpy(monthly._sum.creatorEarningsJpy ?? 0)}
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">最近の販売</h2>
        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">日時</th>
                <th className="p-2 text-left">写真</th>
                <th className="p-2 text-left">購入者</th>
                <th className="p-2 text-left">ライセンス</th>
                <th className="p-2 text-right">販売額</th>
                <th className="p-2 text-right">獲得額</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.paidAt ? formatDateTime(r.paidAt) : "—"}</td>
                  <td className="p-2">{r.photo.title}</td>
                  <td className="p-2">{r.buyer.name ?? "—"}</td>
                  <td className="p-2">{r.licenseKind}</td>
                  <td className="p-2 text-right">{formatJpy(r.grossJpy - r.discountJpy)}</td>
                  <td className="p-2 text-right font-bold">
                    {formatJpy(r.creatorEarningsJpy)}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    販売履歴はまだありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Earning Ledger</h2>
        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">日時</th>
                <th className="p-2 text-left">種別</th>
                <th className="p-2 text-left">ステータス</th>
                <th className="p-2 text-right">金額</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{formatDateTime(e.createdAt)}</td>
                  <td className="p-2">{e.source}</td>
                  <td className="p-2">{e.status}</td>
                  <td className="p-2 text-right">{formatJpy(e.amountJpy)}</td>
                </tr>
              ))}
              {earnings.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    Earning はまだ発生していません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
