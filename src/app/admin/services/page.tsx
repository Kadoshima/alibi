import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModerationActions } from "./moderation-actions";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "サービス審査" };

export default async function AdminServicesPage() {
  await requireAdmin();
  const services = await prisma.service.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { provider: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">サービス審査キュー</h1>
      <p className="mt-2 text-muted-foreground">
        審査を行い、合法的なサービスのみを承認してください。
      </p>
      <div className="mt-6 space-y-4">
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground">審査待ちのサービスはありません。</p>
        )}
        {services.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{s.title}</CardTitle>
                <Badge variant="outline">{s.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                提供者: {s.provider.name} ({s.provider.email})
                {" / "}
                {formatJpy(s.priceJpy)} / {s.durationMin}分
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="whitespace-pre-wrap text-sm">{s.description}</p>
              {s.legalNotes && (
                <p className="whitespace-pre-wrap rounded bg-amber-50 p-3 text-xs text-amber-900">
                  法的注意: {s.legalNotes}
                </p>
              )}
              <ModerationActions serviceId={s.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
