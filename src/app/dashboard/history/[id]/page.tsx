"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Gen = {
  id: string;
  status: string;
  template?: { title: string } | null;
  creditsUsed: number;
  error?: string | null;
  downloadUrl?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export default function GenerationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [gen, setGen] = useState<Gen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function poll() {
      const res = await fetch(`/api/generations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!active) return;
      setGen(data);
      setLoading(false);

      // Keep polling if not terminal
      if (data.status === "QUEUED" || data.status === "PROCESSING") {
        setTimeout(poll, 3000);
      }
    }
    poll();
    return () => { active = false; };
  }, [id]);

  if (loading || !gen) {
    return (
      <div className="container max-w-2xl py-20 text-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">生成結果</h1>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{gen.template?.title ?? "Custom"}</CardTitle>
            <Badge
              variant={
                gen.status === "COMPLETED"
                  ? "success"
                  : gen.status === "FAILED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {gen.status === "QUEUED"
                ? "待機中..."
                : gen.status === "PROCESSING"
                  ? "AI処理中..."
                  : gen.status === "COMPLETED"
                    ? "完了"
                    : "失敗"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(gen.status === "QUEUED" || gen.status === "PROCESSING") && (
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">
                AIがアリバイ写真を生成中です。数十秒〜1分ほどお待ちください。
              </span>
            </div>
          )}

          {gen.status === "COMPLETED" && gen.downloadUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gen.downloadUrl}
                alt="Generated alibi"
                className="w-full rounded border"
              />
              <a href={gen.downloadUrl} download={`alibi-${gen.id}.jpg`}>
                <Button className="w-full">ダウンロード</Button>
              </a>
            </>
          )}

          {gen.status === "FAILED" && (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              生成に失敗しました: {gen.error ?? "不明なエラー"}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            使用クレジット: {gen.creditsUsed}
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={() => router.push("/generate")}>
          もう1枚作る
        </Button>
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          マイページ
        </Button>
      </div>
    </div>
  );
}
