import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaceUpload } from "./face-upload";
import { FaceDelete } from "./face-delete";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "顔写真管理" };

export default async function FacesPage() {
  const user = await requireUser();
  const faces = await prisma.facePhoto.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">顔写真管理</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        AI合成に使う自分のセルフィーを登録します (最大5枚)。正面がおすすめ。
      </p>

      <FaceUpload currentCount={faces.length} />

      <div className="mt-8 space-y-3">
        {faces.map((f) => (
          <Card key={f.id}>
            <CardContent className="flex items-center justify-between p-4 text-sm">
              <div>
                <div className="font-medium">{f.label ?? "顔写真"}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(f.createdAt)} / {f.mimeType}
                </div>
              </div>
              <FaceDelete id={f.id} />
            </CardContent>
          </Card>
        ))}
        {faces.length === 0 && (
          <p className="text-sm text-muted-foreground">まだ登録されていません</p>
        )}
      </div>
    </div>
  );
}
