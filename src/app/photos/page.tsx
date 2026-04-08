import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatJpy } from "@/lib/utils";
import { publicUrl, BUCKETS } from "@/lib/storage";

export const metadata = { title: "写真カタログ" };

type SearchParams = { q?: string; tag?: string; sort?: "new" | "cheap" | "expensive" };

export default async function PhotosPage({ searchParams }: { searchParams?: SearchParams }) {
  const q = searchParams?.q?.trim();
  const tag = searchParams?.tag;
  const sort = searchParams?.sort ?? "new";

  const photos = await prisma.photo.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    },
    include: {
      owner: { select: { name: true } },
      assets: { where: { variant: "THUMB" } },
      tags: { include: { tag: true } },
    },
    orderBy:
      sort === "cheap"
        ? { priceJpy: "asc" }
        : sort === "expensive"
          ? { priceJpy: "desc" }
          : { createdAt: "desc" },
    take: 60,
  });

  const allTags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">写真カタログ</h1>
      <p className="mt-2 text-muted-foreground">
        プライバシー処理済みの写真を、ライセンスを選んで購入できます。
      </p>

      <form className="mt-6 flex flex-wrap gap-2" action="/photos">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="キーワードで検索"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          name="tag"
          defaultValue={tag ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">すべてのタグ</option>
          {allTags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="new">新着順</option>
          <option value="cheap">価格が安い順</option>
          <option value="expensive">価格が高い順</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          絞り込み
        </button>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {photos.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground">
            該当する写真がありません。
          </p>
        )}
        {photos.map((p) => {
          const thumb = p.assets[0];
          const src = thumb ? publicUrl(BUCKETS.PUBLIC, thumb.s3Key) : "/placeholder.svg";
          return (
            <Link href={`/photos/${p.slug}`} key={p.id}>
              <Card className="h-full overflow-hidden transition hover:border-primary hover:shadow-lg">
                <div className="relative aspect-[3/2] bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={p.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-3">
                  <div className="line-clamp-1 font-medium">{p.title}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{p.owner.name ?? "—"}</span>
                    <span className="font-bold text-foreground">{formatJpy(p.priceJpy)}~</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.tags.slice(0, 3).map((t) => (
                      <Badge key={t.tag.id} variant="secondary" className="text-[10px]">
                        {t.tag.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
