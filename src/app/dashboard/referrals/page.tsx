import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "紹介プログラム" };

export default async function ReferralsPage() {
  const user = await requireUser();

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      referrals: {
        select: { id: true, name: true, email: true, createdAt: true },
      },
    },
  });

  // 紹介ユーザーが生み出したGMV
  const referredIds = me?.referrals.map((r) => r.id) ?? [];
  const gmv =
    referredIds.length === 0
      ? { _sum: { totalJpy: 0, platformFeeJpy: 0 } }
      : await prisma.booking.aggregate({
          where: {
            customerId: { in: referredIds },
            status: { in: ["CONFIRMED", "COMPLETED"] },
          },
          _sum: { totalJpy: true, platformFeeJpy: true },
        });

  // 紹介報酬は手数料の10%
  const rewardJpy = Math.floor(((gmv._sum.platformFeeJpy ?? 0) * 10) / 100);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const referralLink = me?.referralCode
    ? `${appUrl}/register?ref=${me.referralCode}`
    : "";

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">紹介プログラム</h1>
      <p className="mt-2 text-muted-foreground">
        お友達を紹介して、紹介した方のプラットフォーム手数料の10%を報酬として獲得できます。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>あなたの紹介リンク</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded bg-muted p-3 font-mono text-sm break-all">{referralLink}</div>
          <p className="mt-2 text-xs text-muted-foreground">
            紹介コード: <strong>{me?.referralCode ?? "—"}</strong>
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">紹介した人数</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{me?.referrals.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">紹介経由GMV</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatJpy(gmv._sum.totalJpy ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">獲得報酬見込</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{formatJpy(rewardJpy)}</CardContent>
        </Card>
      </div>
    </div>
  );
}
