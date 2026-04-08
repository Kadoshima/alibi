import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatJpy, formatDateTime } from "@/lib/utils";
import { DownloadButton } from "./download-button";

export const metadata = { title: "購入履歴" };

export default async function PurchasesPage() {
  const user = await requireUser();
  const purchases = await prisma.photoPurchase.findMany({
    where: { buyerId: user.id },
    include: { photo: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold">購入履歴</h1>
      <div className="mt-6 space-y-3">
        {purchases.length === 0 && (
          <p className="text-sm text-muted-foreground">購入履歴はまだありません。</p>
        )}
        {purchases.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-medium">{p.photo.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(p.createdAt)} / {p.licenseKind}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ダウンロード: {p.downloadCount} / {p.maxDownloads} 回
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {formatJpy(p.grossJpy - p.discountJpy)}
                  </div>
                  <Badge
                    variant={p.status === "PAID" ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {p.status}
                  </Badge>
                </div>
                {p.status === "PAID" && p.downloadCount < p.maxDownloads && (
                  <DownloadButton purchaseId={p.id} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
