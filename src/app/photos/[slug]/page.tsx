import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy } from "@/lib/utils";
import { publicUrl, BUCKETS } from "@/lib/storage";
import { LICENSE_MULTIPLIER } from "@/lib/pricing";
import { PurchaseForm } from "./purchase-form";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const photo = await prisma.photo.findUnique({ where: { slug: params.slug } });
  if (!photo) return { title: "Not Found" };
  return {
    title: photo.title,
    description: (photo.description ?? photo.title).slice(0, 160),
  };
}

export default async function PhotoDetailPage({ params }: { params: { slug: string } }) {
  const photo = await prisma.photo.findUnique({
    where: { slug: params.slug },
    include: {
      owner: { select: { id: true, name: true } },
      assets: true,
      tags: { include: { tag: true } },
      reviews: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!photo || photo.status !== "ACTIVE") notFound();

  const masked = photo.assets.find((a) => a.variant === "MASKED");
  const previewUrl = masked ? publicUrl(BUCKETS.PUBLIC, masked.s3Key) : "/placeholder.svg";

  const avg =
    photo.reviews.length === 0
      ? null
      : photo.reviews.reduce((a, r) => a + r.rating, 0) / photo.reviews.length;

  const maxRank = { PERSONAL: 1, COMMERCIAL: 2, EXTENDED: 3 }[photo.maxLicense];
  const available = (["PERSONAL", "COMMERCIAL", "EXTENDED"] as const).filter(
    (k) => ({ PERSONAL: 1, COMMERCIAL: 2, EXTENDED: 3 })[k] <= maxRank,
  );

  return (
    <div className="container py-10">
      <Link href="/photos" className="text-sm text-muted-foreground hover:underline">
        ← 一覧へ戻る
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={photo.title} className="h-full w-full object-contain" />
            <div className="absolute left-3 top-3 rounded bg-black/60 px-2 py-1 text-xs text-white">
              プレビュー(プライバシー処理済み)
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-bold">{photo.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span>クリエイター: {photo.owner.name ?? "—"}</span>
            {avg !== null && (
              <span>
                ★ {avg.toFixed(1)} ({photo.reviews.length}件)
              </span>
            )}
          </div>

          {photo.description && (
            <p className="mt-4 whitespace-pre-wrap leading-relaxed">{photo.description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {photo.tags.map((t) => (
              <Link key={t.tag.id} href={`/photos?tag=${t.tag.slug}`}>
                <Badge variant="secondary">{t.tag.name}</Badge>
              </Link>
            ))}
          </div>

          <Card className="mt-8 border-emerald-300 bg-emerald-50/40">
            <CardHeader>
              <CardTitle className="text-emerald-900">🛡️ プライバシー処理済み</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-emerald-900">
              <ul className="space-y-1">
                <li>
                  ✅ EXIF (位置情報・カメラ情報・撮影日時)が削除済み
                  {photo.privacyExifStripped ? "" : " (処理中)"}
                </li>
                <li>
                  ✅ 顔・プライバシー対象領域 {photo.privacyFacesCount} 箇所を自動ぼかし
                </li>
              </ul>
            </CardContent>
          </Card>

          {photo.reviews.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold">レビュー</h2>
              <div className="mt-3 space-y-3">
                {photo.reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.author.name ?? "—"}</span>
                        <span>★ {r.rating}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ライセンスを選択</CardTitle>
            </CardHeader>
            <CardContent>
              <PurchaseForm
                photoId={photo.id}
                basePriceJpy={photo.priceJpy}
                availableLicenses={available.map((k) => ({
                  kind: k,
                  priceJpy: Math.floor(photo.priceJpy * LICENSE_MULTIPLIER[k]),
                  label:
                    k === "PERSONAL"
                      ? "個人利用"
                      : k === "COMMERCIAL"
                        ? "商用利用"
                        : "拡張商用(再配布可)"
                }))}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                購入後、原本(透かしなし)を最大5回までダウンロードできます。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ライセンスの違い</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">個人利用 (x1)</strong>:
                SNS 投稿、私的な印刷等
              </p>
              <p>
                <strong className="text-foreground">商用利用 (x3)</strong>:
                Web サイト、広告、商品パッケージ
              </p>
              <p>
                <strong className="text-foreground">拡張商用 (x6)</strong>:
                再販・テンプレート販売等まで
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
