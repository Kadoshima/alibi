import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "プロバイダ入金管理" };

export default async function AdminPayoutsPage() {
  await requireAdmin();

  // プロバイダ別の未決済・確定済み売上集計
  const agg = await prisma.booking.groupBy({
    by: ["providerId"],
    where: { status: { in: ["COMPLETED"] } },
    _sum: { totalJpy: true, platformFeeJpy: true },
    _count: true,
  });

  const providerIds = agg.map((a) => a.providerId);
  const providers = await prisma.user.findMany({
    where: { id: { in: providerIds } },
    select: { id: true, name: true, email: true, platformFeeBps: true },
  });
  const providerMap = new Map(providers.map((p) => [p.id, p]));

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">プロバイダ入金管理</h1>
      <p className="text-muted-foreground">
        完了した予約に基づく、プロバイダへの支払予定額を確認します。
      </p>

      <div className="mt-6 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">プロバイダ</th>
              <th className="p-2 text-right">完了件数</th>
              <th className="p-2 text-right">GMV</th>
              <th className="p-2 text-right">手数料</th>
              <th className="p-2 text-right">入金予定額</th>
              <th className="p-2 text-right">手数料率</th>
            </tr>
          </thead>
          <tbody>
            {agg.map((a) => {
              const p = providerMap.get(a.providerId);
              const gmv = a._sum.totalJpy ?? 0;
              const fee = a._sum.platformFeeJpy ?? 0;
              const payout = gmv - fee;
              return (
                <tr key={a.providerId} className="border-t">
                  <td className="p-2">
                    {p?.name ?? "—"}
                    <div className="text-xs text-muted-foreground">{p?.email}</div>
                  </td>
                  <td className="p-2 text-right">{a._count}</td>
                  <td className="p-2 text-right">{formatJpy(gmv)}</td>
                  <td className="p-2 text-right">{formatJpy(fee)}</td>
                  <td className="p-2 text-right font-bold">{formatJpy(payout)}</td>
                  <td className="p-2 text-right">
                    {((p?.platformFeeBps ?? 0) / 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
            {agg.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  完了した予約はまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
