import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatJpy } from "@/lib/utils";
import type { ServiceCategory } from "@prisma/client";

export const metadata = { title: "サービス一覧" };

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  EMPLOYMENT_VERIFICATION: "在籍確認サポート",
  SCHEDULE_COVER: "スケジュール調整",
  PROXY_ATTENDANCE: "代理出席",
  SURPRISE_PLANNING: "サプライズ企画",
  PRIVACY_CONSULT: "プライバシー相談",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: { category?: string; q?: string };
}) {
  const category = searchParams?.category as ServiceCategory | undefined;
  const q = searchParams?.q?.trim();

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { provider: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">サービス一覧</h1>
      <p className="mt-2 text-muted-foreground">
        登録済みの全サービスは管理者による事前審査を通過したもののみです。
      </p>

      <form className="mt-6 flex flex-wrap gap-2" action="/services">
        <input
          name="q"
          defaultValue={q}
          placeholder="キーワードで検索"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">すべてのカテゴリ</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          絞り込み
        </button>
      </form>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground">
            該当するサービスがありません。
          </p>
        )}
        {services.map((s) => (
          <Link href={`/services/${s.slug}`} key={s.id}>
            <Card className="h-full transition hover:border-primary hover:shadow-md">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {CATEGORY_LABELS[s.category]}
                </Badge>
                <CardTitle className="mt-2">{s.title}</CardTitle>
                <CardDescription className="line-clamp-3">{s.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold">{formatJpy(s.priceJpy)}</span>
                  <span className="text-sm text-muted-foreground">{s.durationMin}分</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  提供者: {s.provider.name ?? "—"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
