"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = "upload" | "edit" | "done";

export function TicketEditor({ credits }: { credits: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [newDate, setNewDate] = useState("");
  const [datePos, setDatePos] = useState({ x: 50, y: 50 });
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState("#000000");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);

    if (newDate.trim()) {
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = fontColor;
      ctx.fillText(newDate, datePos.x, datePos.y);
    }
  }, [image, newDate, datePos, fontSize, fontColor]);

  useEffect(() => {
    draw();
  }, [draw]);

  function onFileSelect(f: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("JPEG / PNG / WebP のみ対応");
      return;
    }
    // Filename check
    const lower = f.name.toLowerCase();
    if (["receipt", "invoice", "領収", "レシート", "請求"].some((k) => lower.includes(k))) {
      setError("領収書・レシートの編集は禁止されています");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setStep("edit");
      };
      img.src = String(ev.target?.result ?? "");
    };
    reader.readAsDataURL(f);
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setDatePos({
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    });
  }

  async function onSave() {
    if (!newDate.trim() || credits < 1) return;
    setLoading(true);
    setError(null);

    // Record the edit (MVP: actual image stored client-side)
    const res = await fetch("/api/ticket-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadKey: `ticket-edit-${Date.now()}`,
        bucket: "client-local",
        newDate: newDate,
        originalMime: "image/jpeg",
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました");
      return;
    }

    // Download the canvas result
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `ticket-${newDate}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        },
        "image/jpeg",
        0.92,
      );
    }
    setStep("done");
    router.refresh();
  }

  if (step === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>完了</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">編集済みチケットがダウンロードされました。</p>
          <Button onClick={() => { setStep("upload"); setImage(null); setNewDate(""); }}>
            もう1枚編集する
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {step === "upload" && (
        <Card
          className="flex cursor-pointer flex-col items-center justify-center border-dashed p-12 text-center hover:border-primary"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) onFileSelect(f);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
          />
          <div className="text-5xl">🎫</div>
          <p className="mt-4 font-medium">チケット画像をドロップ、またはクリック</p>
          <p className="mt-1 text-xs text-muted-foreground">JPEG / PNG / WebP</p>
        </Card>
      )}

      {step === "edit" && image && (
        <>
          <p className="text-sm text-muted-foreground">
            キャンバスをクリックして日付を配置する位置を指定 → 新しい日付を入力 → 保存
          </p>
          <div className="overflow-hidden rounded border bg-muted">
            <canvas
              ref={canvasRef}
              className="h-auto w-full cursor-crosshair"
              onClick={onCanvasClick}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium">新しい日付</label>
              <Input
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="2026/04/10"
              />
            </div>
            <div>
              <label className="text-xs font-medium">フォントサイズ</label>
              <Input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                min={8}
                max={200}
              />
            </div>
            <div>
              <label className="text-xs font-medium">色</label>
              <Input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">位置</label>
              <p className="mt-1 text-xs text-muted-foreground">
                x:{datePos.x} y:{datePos.y}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={loading || !newDate.trim() || credits < 1}>
              {loading ? "処理中..." : "保存してダウンロード (1CR)"}
            </Button>
            <Button variant="outline" onClick={() => { setStep("upload"); setImage(null); }}>
              別の画像を選ぶ
            </Button>
          </div>
        </>
      )}

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
