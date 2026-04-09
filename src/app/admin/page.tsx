import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "管理ダッシュボード" };

export default async function AdminPage() {
  await requireAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [userCount, photoCount, pendingPhotos, purchaseCount, monthAgg, recentAudit] =
    await Promise.all([
      prisma.user.count(),
      prisma.photo.count(),
      prisma.photo.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.photoPurchase.count({ where: { status: "PAID" } }),
      prisma.photoPurchase.aggregate({
        where: { status: "PAID", paidAt: { gte: monthStart } },
        _sum: { grossJpy: true, platformFeeJpy: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { user: { select: { email: true } } },
      }),
    ]);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">管理ダッシュボード</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <StatCard label="ユーザー" value={userCount} />
        <StatCard label="写真" value={photoCount} />
        <StatCard
          label="審査待ち"
          value={pendingPhotos}
          accent="text-amber-600"
          href="/admin/photos"
        />
        <StatCard label="購入累計" value={purchaseCount} />
        <StatCard label="当月プラットフォーム収益" value={formatJpy(monthAgg._sum.platformFeeJpy ?? 0)} />
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/photos" className="text-primary underline">
          写真審査
        </Link>
        <Link href="/admin/coupons" className="text-primary underline">
          クーポン管理
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

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  accent?: string;
  href?: string;
}) {
  const body = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className={`text-2xl font-bold ${accent ?? ""}`}>{value}</CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
