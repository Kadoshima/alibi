import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/credits";
import { publicUrl, BUCKETS } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GenerateForm } from "./generate-form";
import Link from "next/link";
import type { TemplateCategory } from "@prisma/client";

export const metadata = { title: "AI 顔合成 - アリバイを作る" };

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  CINEMA: "映画館",
  RESTAURANT: "レストラン",
  BAR: "バー・居酒屋",
  CAFE: "カフェ",
  TRAVEL: "旅行",
  SPORTS: "スポーツ",
  SHOPPING: "ショッピング",
  OUTDOOR: "アウトドア",
  EVENT: "イベント",
  OTHER: "その他",
};

export default async function GeneratePage() {
  const user = await requireUser();
  const credits = await getBalance(user.id);

  const [templates, facePhotos] = await Promise.all([
    prisma.template.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.facePhoto.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 顔合成</h1>
          <p className="mt-1 text-muted-foreground">
            テンプレートを選んで、あなたの顔を合成した「アリバイ写真」を生成します。
          </p>
        </div>
        <Badge variant="outline" className="text-base">
          残りクレジット: {credits}
        </Badge>
      </div>

      {facePhotos.length === 0 && (
        <Card className="mt-6 border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">顔写真を登録してください</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            まず
            <Link href="/dashboard/faces" className="font-bold underline">
              マイページ → 顔写真管理
            </Link>
            から自分のセルフィーを登録してください。
          </CardContent>
        </Card>
      )}

      <GenerateForm
        templates={templates.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          categoryLabel: CATEGORY_LABELS[t.category],
          premium: t.premium,
          thumbUrl: publicUrl(BUCKETS.PUBLIC, t.thumbS3Key),
        }))}
        facePhotos={facePhotos.map((f) => ({
          id: f.id,
          label: f.label ?? "顔写真",
        }))}
        credits={credits}
      />
    </div>
  );
}
