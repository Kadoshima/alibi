import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const service = await prisma.service.findUnique({ where: { slug: params.slug } });
  if (!service) return { title: "Not Found" };
  return { title: service.title, description: service.description.slice(0, 160) };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = await prisma.service.findUnique({
    where: { slug: params.slug },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          kycStatus: true,
          reviewsReceived: {
            select: { rating: true },
          },
        },
      },
    },
  });

  if (!service || service.status !== "ACTIVE") notFound();

  const reviews = service.provider.reviewsReceived;
  const avg =
    reviews.length === 0 ? null : reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return (
    <div className="container max-w-4xl py-10">
      <Link href="/services" className="text-sm text-muted-foreground hover:underline">
        ← サービス一覧へ戻る
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="secondary">{service.category}</Badge>
          <h1 className="mt-2 text-3xl font-bold">{service.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            提供者: {service.provider.name ?? "—"}
            {service.provider.kycStatus === "APPROVED" && (
              <Badge variant="success" className="ml-2">
                本人確認済
              </Badge>
            )}
            {avg !== null && (
              <span className="ml-3">
                ★ {avg.toFixed(1)} ({reviews.length}件)
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{formatJpy(service.priceJpy)}</div>
          <div className="text-sm text-muted-foreground">所要時間: {service.durationMin}分</div>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>サービス内容</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed">{service.description}</p>
        </CardContent>
      </Card>

      {service.legalNotes && (
        <Card className="mt-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-200">法的注意事項</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-amber-900 dark:text-amber-200">
              {service.legalNotes}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex justify-end">
        <Link href={`/services/${service.slug}/book`}>
          <Button size="lg">このサービスを予約する</Button>
        </Link>
      </div>
    </div>
  );
}
