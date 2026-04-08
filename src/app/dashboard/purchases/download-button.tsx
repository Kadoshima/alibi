"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DownloadButton({ purchaseId }: { purchaseId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/purchases/${purchaseId}/download`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.url) {
      setError(data.error ?? "ダウンロードに失敗しました");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={onClick} disabled={loading}>
        {loading ? "準備中..." : "原本をダウンロード"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
