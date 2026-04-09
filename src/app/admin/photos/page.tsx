import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatJpy, formatDateTime } from "@/lib/utils";
import { publicUrl, BUCKETS } from "@/lib/storage";
import { ReviewActions } from "./review-actions";

export const metadata = { title: "写真審査" };

type SearchParams = { status?: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" };

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAdmin();
  const status = searchParams?.status ?? "PENDING_REVIEW";

  const photos = await prisma.photo.findMany({
    where: { status },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      assets: { where: { variant: "MASKED" } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">写真審査</h1>
      <p className="mt-2 text-muted-foreground">
        アップロード済みでプライバシー処理を終えた写真を確認して、公開可否を判断します。
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        <StatusTab current={status} value="PENDING_REVIEW" label="審査待ち" />
        <StatusTab current={status} value="ACTIVE" label="公開中" />
        <StatusTab current={status} value="SUSPENDED" label="停止中" />
      </div>

      <div className="mt-6 space-y-6">
        {photos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            該当する写真がありません。
          </p>
        )}
        {photos.map((p) => {
          const masked = p.assets[0];
          const preview = masked
            ? publicUrl(BUCKETS.PUBLIC, masked.s3Key)
            : "/placeholder.svg";
          return (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.title}</CardTitle>
                  <Badge variant="secondary">{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(p.createdAt)} / {formatJpy(p.priceJpy)} / {p.maxLicense}
                </p>
                <p className="text-xs text-muted-foreground">
                  出品者: {p.owner.name ?? "—"} ({p.owner.email})
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 md:grid-cols-[300px_1fr]">
                  <div className="overflow-hidden rounded border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={p.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    {p.description && (
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <Badge key={t.tag.id} variant="outline" className="text-[10px]">
                          {t.tag.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ✅ EXIF削除:{" "}
                      <strong>{p.privacyExifStripped ? "済" : "未"}</strong> /
                      顔ぼかし:{" "}
                      <strong>{p.privacyFacesCount}</strong> 箇所
                    </p>
                    {p.rejectedReason && (
                      <p className="rounded bg-destructive/10 p-2 text-xs text-destructive">
                        却下理由: {p.rejectedReason}
                      </p>
                    )}
                  </div>
                </div>
                <ReviewActions photoId={p.id} currentStatus={p.status} />
                <p className="text-xs">
                  <Link
                    href={`/photos/${p.slug}`}
                    className="text-primary underline"
                    target="_blank"
                  >
                    公開プレビュー →
                  </Link>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatusTab({
  current,
  value,
  label,
}: {
  current: string;
  value: string;
  label: string;
}) {
  const active = current === value;
  return (
    <Link
      href={`/admin/photos?status=${value}`}
      className={`rounded-md px-3 py-1 ${
        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );
}
