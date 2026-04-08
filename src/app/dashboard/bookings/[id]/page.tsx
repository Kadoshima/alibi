import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatJpy } from "@/lib/utils";
import { BookingActions } from "./booking-actions";

export const metadata = { title: "予約詳細" };

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { paid?: string; cancelled?: string };
}) {
  const user = await requireUser();
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      service: true,
      payment: true,
      customer: { select: { id: true, name: true, email: true } },
      provider: { select: { id: true, name: true, email: true } },
    },
  });

  if (!booking) notFound();

  const isCustomer = booking.customerId === user.id;
  const isProvider = booking.providerId === user.id;
  if (!isCustomer && !isProvider && user.role !== "ADMIN") notFound();

  const canPay = isCustomer && (!booking.payment || booking.payment.status === "PENDING");

  return (
    <div className="container max-w-3xl py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← マイページへ
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{booking.service.title}</h1>
      <div className="mt-2 flex items-center gap-3">
        <Badge variant="secondary">{booking.status}</Badge>
        {booking.payment && <Badge variant="outline">支払: {booking.payment.status}</Badge>}
      </div>

      {searchParams?.paid === "1" && (
        <div className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          お支払いが完了しました。提供者からの確認をお待ちください。
        </div>
      )}
      {searchParams?.cancelled === "1" && (
        <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          お支払いがキャンセルされました。
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>予約情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">日時: </span>
            {formatDateTime(booking.scheduledFor)}
          </div>
          <div>
            <span className="text-muted-foreground">金額: </span>
            {formatJpy(booking.totalJpy)}
          </div>
          <div>
            <span className="text-muted-foreground">顧客: </span>
            {booking.customer.name} ({booking.customer.email})
          </div>
          <div>
            <span className="text-muted-foreground">提供者: </span>
            {booking.provider.name} ({booking.provider.email})
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>申告された利用目的</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{booking.purpose}</p>
          {booking.notes && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              備考: {booking.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <BookingActions
          bookingId={booking.id}
          status={booking.status}
          isCustomer={isCustomer}
          isProvider={isProvider}
          canPay={canPay}
        />
      </div>
    </div>
  );
}
