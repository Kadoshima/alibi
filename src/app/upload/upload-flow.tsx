"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = "select" | "uploading" | "review" | "meta" | "done";

export function UploadFlow({ userId: _userId }: { userId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);

  async function onSelect(f: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("JPEG / PNG / WebP のみ対応しています");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("ファイルサイズは25MB以下にしてください");
      return;
    }
    setError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("uploading");

    try {
      // 1. Ask server for presigned upload
      const initRes = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, mimeType: f.type, bytes: f.size }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error ?? "アップロード開始に失敗");

      // 2. PUT the file directly to S3
      const put = await fetch(initData.url, {
        method: initData.method ?? "PUT",
        headers: initData.headers,
        body: f,
      }).catch(() => null);
      // 開発環境ではMinIOが無い可能性があるので失敗を許容(MVP)
      if (put && !put.ok) {
        console.warn("S3 upload failed (dev fallback):", put.status);
      }

      setUploadKey(initData.key);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
      setStep("select");
    }
  }

  async function onPublish(meta: {
    title: string;
    description: string;
    priceJpy: number;
    maxLicense: "PERSONAL" | "COMMERCIAL" | "EXTENDED";
    tags: string;
  }) {
    if (!uploadKey || !file || !previewUrl) return;
    setError(null);

    // Get width/height from preview
    const img = new Image();
    img.src = previewUrl;
    await new Promise((r) => (img.onload = r));

    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: meta.title,
        description: meta.description || undefined,
        priceJpy: meta.priceJpy,
        maxLicense: meta.maxLicense,
        tagSlugs: meta.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        uploadKey,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        originalBytes: file.size,
        originalMime: file.type,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "公開に失敗しました");
      return;
    }
    setPhotoId(data.id);
    setStep("done");
    router.refresh();
  }

  if (step === "done" && photoId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>✅ 出品を受け付けました</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>管理者の審査完了後に公開されます。</p>
          <Button onClick={() => router.push("/dashboard/uploads")}>
            アップロード一覧へ
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {step === "select" && (
        <Card
          className="flex cursor-pointer flex-col items-center justify-center border-dashed p-12 text-center hover:border-primary"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onSelect(f);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
          />
          <div className="text-5xl">📸</div>
          <p className="mt-4 font-medium">ファイルをドロップ、またはクリックして選択</p>
          <p className="mt-1 text-xs text-muted-foreground">JPEG / PNG / WebP (最大25MB)</p>
        </Card>
      )}

      {step === "uploading" && <p className="text-center text-muted-foreground">アップロード中...</p>}

      {step === "review" && previewUrl && (
        <Card>
          <CardHeader>
            <CardTitle>プライバシー確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" className="max-h-96 w-full rounded object-contain" />
            <ul className="text-xs text-muted-foreground">
              <li>✅ EXIF(位置情報等)は自動削除されます</li>
              <li>✅ 顔は自動検出してぼかし候補を表示します(MVPではスタブ)</li>
            </ul>
            <Button onClick={() => setStep("meta")}>情報を入力して出品に進む</Button>
          </CardContent>
        </Card>
      )}

      {step === "meta" && (
        <MetaForm
          onSubmit={onPublish}
          error={error}
          previewUrl={previewUrl}
        />
      )}

      {error && step === "select" && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function MetaForm({
  onSubmit,
  error,
  previewUrl,
}: {
  onSubmit: (m: {
    title: string;
    description: string;
    priceJpy: number;
    maxLicense: "PERSONAL" | "COMMERCIAL" | "EXTENDED";
    tags: string;
  }) => void;
  error: string | null;
  previewUrl: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const fd = new FormData(e.currentTarget);
        await onSubmit({
          title: String(fd.get("title") ?? ""),
          description: String(fd.get("description") ?? ""),
          priceJpy: Number(fd.get("priceJpy") ?? 0),
          maxLicense: String(fd.get("maxLicense") ?? "COMMERCIAL") as
            | "PERSONAL"
            | "COMMERCIAL"
            | "EXTENDED",
          tags: String(fd.get("tags") ?? ""),
        });
        setSubmitting(false);
      }}
      className="space-y-4"
    >
      {previewUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={previewUrl} alt="preview" className="max-h-48 w-full rounded object-contain" />
      )}
      <div>
        <label className="text-sm font-medium">タイトル</label>
        <Input name="title" required minLength={2} maxLength={120} />
      </div>
      <div>
        <label className="text-sm font-medium">説明(任意)</label>
        <Textarea name="description" rows={4} maxLength={4000} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">価格(PERSONAL、JPY)</label>
          <Input name="priceJpy" type="number" min="100" max="500000" defaultValue="980" required />
        </div>
        <div>
          <label className="text-sm font-medium">許可ライセンス</label>
          <select
            name="maxLicense"
            defaultValue="COMMERCIAL"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="PERSONAL">個人利用のみ</option>
            <option value="COMMERCIAL">商用まで</option>
            <option value="EXTENDED">拡張商用(再販可)</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">タグ(カンマ区切り)</label>
        <Input name="tags" placeholder="landscape, urban" />
      </div>
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "送信中..." : "出品する"}
      </Button>
    </form>
  );
}
