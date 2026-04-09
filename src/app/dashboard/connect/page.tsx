import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectButton } from "./connect-button";

export const metadata = { title: "Stripe Connect 設定" };

export default async function ConnectPage({
  searchParams,
}: {
  searchParams?: { return?: string; refresh?: string };
}) {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      stripeConnectAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectPayoutsEnabled: true,
    },
  });

  const hasAccount = Boolean(user?.stripeConnectAccountId);
  const chargesEnabled = user?.stripeConnectChargesEnabled ?? false;
  const payoutsEnabled = user?.stripeConnectPayoutsEnabled ?? false;

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">Stripe Connect 設定</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        クリエイターとして売上を受け取るために、Stripe アカウントの連携が必要です。
        連携後は販売のたびに自動で手数料が分割され、あなたの Stripe 残高に入金されます。
      </p>

      {searchParams?.return === "1" && (
        <div className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Stripe からのオンボーディングが完了しました。ステータスを更新しています。
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>現在のステータス</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            アカウント登録:
            {hasAccount ? (
              <Badge variant="success">済</Badge>
            ) : (
              <Badge variant="secondary">未</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            売上の受取:
            {chargesEnabled ? (
              <Badge variant="success">有効</Badge>
            ) : (
              <Badge variant="secondary">未有効</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            銀行振込:
            {payoutsEnabled ? (
              <Badge variant="success">有効</Badge>
            ) : (
              <Badge variant="secondary">未有効</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <ConnectButton hasAccount={hasAccount} chargesEnabled={chargesEnabled} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-sm">手数料の仕組み</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>販売が成立するたびに、Stripe が金額を自動分割します:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>あなたの取り分 (デフォルト 80%) → あなたの Stripe 残高</li>
            <li>プラットフォーム手数料 (デフォルト 20%) → Alibi 運営</li>
          </ul>
          <p>入金サイクルは Stripe の設定に従います(日本では通常週次)。</p>
        </CardContent>
      </Card>
    </div>
  );
}
