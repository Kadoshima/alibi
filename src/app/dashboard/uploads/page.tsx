import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatJpy, formatDateTime } from "@/lib/utils";

export const metadata = { title: "出品中の写真" };

export default async function UploadsPage() {
  const user = await requireUser();
  const photos = await prisma.photo.findMany({
    where: { ownerId: user.id },
    include: {
      _count: { select: { purchases: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">出品中の写真</h1>
        <Link href="/upload" className="text-sm text-primary underline">
          + 新しく出品
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {photos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            まだ出品していません。<Link href="/upload" className="text-primary underline">最初の写真をアップロード</Link>
          </p>
        )}
        {photos.map((p) => (
          <Link key={p.id} href={`/photos/${p.slug}`}>
            <Card className="transition hover:border-primary">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(p.createdAt)} / 購入 {p._count.purchases} 回
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatJpy(p.priceJpy)}</div>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
