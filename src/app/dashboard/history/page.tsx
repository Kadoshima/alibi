import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "生成履歴" };

export default async function HistoryPage() {
  const user = await requireUser();
  const generations = await prisma.generation.findMany({
    where: { userId: user.id },
    include: { template: { select: { title: true, category: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">生成履歴</h1>
      <p className="mt-2 text-muted-foreground">これまでに生成したアリバイ写真の一覧です。</p>

      <div className="mt-6 space-y-2">
        {generations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            まだ生成していません。<Link href="/generate" className="text-primary underline">最初のアリバイを作る</Link>
          </p>
        )}
        {generations.map((g) => (
          <Link href={`/dashboard/history/${g.id}`} key={g.id}>
            <Card className="transition hover:border-primary">
              <CardContent className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="font-medium">{g.template?.title ?? "Custom"}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(g.createdAt)} / {g.creditsUsed}CR
                  </div>
                </div>
                <Badge
                  variant={
                    g.status === "COMPLETED" ? "success"
                    : g.status === "FAILED" ? "destructive"
                    : "secondary"
                  }
                >
                  {g.status}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
