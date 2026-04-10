import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "管理ダッシュボード" };

export default async function AdminPage() {
  await requireAdmin();

  const [userCount, templateCount, genCount, genQueued, ticketCount, recentAudit] =
    await Promise.all([
      prisma.user.count(),
      prisma.template.count(),
      prisma.generation.count(),
      prisma.generation.count({ where: { status: "QUEUED" } }),
      prisma.ticketEdit.count(),
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
        <StatCard label="テンプレート" value={templateCount} />
        <StatCard label="AI生成" value={genCount} />
        <StatCard label="キュー待ち" value={genQueued} accent="text-amber-600" />
        <StatCard label="チケット編集" value={ticketCount} />
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/templates" className="text-primary underline">
          テンプレート管理
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

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className={`text-2xl font-bold ${accent ?? ""}`}>{value}</CardContent>
    </Card>
  );
}
