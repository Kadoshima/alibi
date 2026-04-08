import { requireUser } from "@/lib/rbac";
import { UploadFlow } from "./upload-flow";

export const metadata = { title: "写真をアップロード" };

export default async function UploadPage() {
  const user = await requireUser();

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">写真をアップロード</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ドラッグ&ドロップで画像を選択。EXIF情報は自動削除、顔は自動ぼかし候補として検出されます。
      </p>
      <div className="mt-8">
        <UploadFlow userId={user.id} />
      </div>
    </div>
  );
}
