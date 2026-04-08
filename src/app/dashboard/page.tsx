import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatJpy } from "@/lib/utils";

export const metadata = { title: "マイページ" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [bookings, services] = await Promise.all([
    prisma.booking.findMany({
      where: {
        OR: [{ customerId: user.id }, { providerId: user.id }],
      },
      include: { service: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    user.role === "PROVIDER" || user.role === "ADMIN"
      ? prisma.service.findMany({
          where: { providerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">マイページ</h1>
          <p className="text-muted-foreground">
            {user.name ?? user.email} さん / ロール: {user.role} / KYC: {user.kycStatus}
          </p>
        </div>
        {user.role === "PROVIDER" && (
          <Link
            href="/dashboard/services/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            新規サービス登録
          </Link>
        )}
      </div>

      {user.kycStatus !== "APPROVED" && (
        <Card className="mt-6 border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">本人確認（KYC）が未完了です</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            予約・決済・サービス提供を行うには本人確認が必要です。
            <Link href="/dashboard/kyc" className="ml-2 underline">
              手続きを開始
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">最近の予約</h2>
        <div className="mt-4 space-y-3">
          {bookings.length === 0 && (
            <p className="text-sm text-muted-foreground">予約はまだありません。</p>
          )}
          {bookings.map((b) => (
            <Link key={b.id} href={`/dashboard/bookings/${b.id}`}>
              <Card className="transition hover:border-primary">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{b.service.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(b.scheduledFor)}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{b.status}</Badge>
                    <div className="text-sm font-bold">{formatJpy(b.totalJpy)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {services.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">あなたのサービス</h2>
          <div className="mt-4 grid gap-3">
            {services.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatJpy(s.priceJpy)} / {s.durationMin}分
                    </div>
                  </div>
                  <Badge variant="secondary">{s.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
