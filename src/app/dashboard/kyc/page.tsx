import { requireUser } from "@/lib/rbac";
import { KycForm } from "./kyc-form";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "本人確認 (KYC)" };

export default async function KycPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { kycStatus: true, name: true, phone: true },
  });

  return (
    <div className="container max-w-xl py-10">
      <h1 className="text-3xl font-bold">本人確認 (KYC)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        予約・決済のために本人確認が必要です。
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>現在のステータス: {user?.kycStatus}</CardTitle>
        </CardHeader>
        <CardContent>
          <KycForm initial={{ name: user?.name ?? "", phone: user?.phone ?? "" }} />
          <p className="mt-3 text-xs text-muted-foreground">
            ※ MVPではスタブ実装。本番では Onfido / SourceID 等の外部プロバイダと連携します。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
