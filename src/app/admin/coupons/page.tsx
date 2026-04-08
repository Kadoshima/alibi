import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponCreateForm } from "./coupon-form";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "クーポン管理" };

export default async function AdminCouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">クーポン管理</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>新規発行</CardTitle>
        </CardHeader>
        <CardContent>
          <CouponCreateForm />
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">発行済みクーポン</h2>
        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">コード</th>
                <th className="p-2 text-left">種別</th>
                <th className="p-2 text-left">値</th>
                <th className="p-2 text-right">利用 / 上限</th>
                <th className="p-2 text-left">期限</th>
                <th className="p-2 text-left">状態</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} className="border-t">
                  <td className="p-2 font-mono">{c.code}</td>
                  <td className="p-2">{c.kind}</td>
                  <td className="p-2">
                    {c.kind === "PERCENT"
                      ? `${((c.percentBps ?? 0) / 100).toFixed(1)}%`
                      : formatJpy(c.valueJpy ?? 0)}
                  </td>
                  <td className="p-2 text-right">
                    {c.redeemedCount} / {c.maxRedemptions ?? "∞"}
                  </td>
                  <td className="p-2">
                    {c.validUntil ? c.validUntil.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="p-2">{c.active ? "有効" : "無効"}</td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    クーポンはまだありません
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
