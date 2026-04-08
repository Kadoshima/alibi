import { StudioEditor } from "./studio-editor";

export const metadata = { title: "Studio - 写真編集ツール" };

export default function StudioPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Studio</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ブラウザ内で完結する写真編集ツール。明るさ・コントラスト・フィルタ・透かしを追加して、
        ダウンロードまたはそのまま出品できます。
      </p>
      <div className="mt-8">
        <StudioEditor />
      </div>
    </div>
  );
}
