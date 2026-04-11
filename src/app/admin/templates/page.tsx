import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateUpload } from "./template-upload";
import type { TemplateCategory } from "@prisma/client";

export const metadata = { title: "テンプレート管理" };

const CAT_LABEL: Record<TemplateCategory, string> = {
  CINEMA: "映画館", RESTAURANT: "レストラン", BAR: "バー", CAFE: "カフェ",
  TRAVEL: "旅行", SPORTS: "スポーツ", SHOPPING: "ショッピング",
  OUTDOOR: "アウトドア", EVENT: "イベント", OTHER: "その他",
};

export default async function AdminTemplatesPage() {
  await requireAdmin();
  const templates = await prisma.template.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">テンプレート管理</h1>
      <p className="mt-2 text-muted-foreground">
        AI合成に使うシーン別ベース画像を管理します。
      </p>

      <TemplateUpload />

      <div className="mt-8 space-y-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {CAT_LABEL[t.category]} / {t.slug} / sort:{t.sortOrder}
                </div>
                <div className="text-xs text-muted-foreground">
                  s3: {t.s3Key}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.premium && <Badge>Premium</Badge>}
                <Badge variant={t.active ? "success" : "secondary"}>
                  {t.active ? "公開" : "非公開"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">テンプレートがありません</p>
        )}
      </div>
    </div>
  );
}
