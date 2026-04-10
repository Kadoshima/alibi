"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function FaceUpload({ currentCount }: { currentCount: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("正面");

  async function onSelect(f: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("JPEG / PNG / WebP のみ");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("10MB以下にしてください");
      return;
    }
    setError(null);
    setLoading(true);

    // 1. Get presigned URL
    const initRes = await fetch("/api/face-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: f.name,
        mimeType: f.type,
        bytes: f.size,
        label,
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok) {
      setError(initData.error ?? "登録に失敗しました");
      setLoading(false);
      return;
    }

    // 2. Upload directly to S3
    await fetch(initData.uploadUrl, {
      method: initData.uploadMethod ?? "PUT",
      headers: initData.uploadHeaders,
      body: f,
    }).catch(() => null);

    setLoading(false);
    router.refresh();
  }

  if (currentCount >= 5) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">上限の5枚に達しています。</p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs font-medium">ラベル (任意)</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={loading}>
          {loading ? "アップロード中..." : "顔写真を追加"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
