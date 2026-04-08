"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Filter = "none" | "grayscale" | "sepia" | "vivid";

type Adjustments = {
  brightness: number; // 0..200
  contrast: number;   // 0..200
  saturation: number; // 0..200
  filter: Filter;
  watermark: string;
};

const INITIAL: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  filter: "none",
  watermark: "",
};

export function StudioEditor() {
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [adj, setAdj] = useState<Adjustments>(INITIAL);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Apply CSS-style filter via canvas filter API.
    const parts: string[] = [];
    parts.push(`brightness(${adj.brightness}%)`);
    parts.push(`contrast(${adj.contrast}%)`);
    parts.push(`saturate(${adj.saturation}%)`);
    if (adj.filter === "grayscale") parts.push("grayscale(100%)");
    if (adj.filter === "sepia") parts.push("sepia(80%)");
    if (adj.filter === "vivid") parts.push("saturate(150%) contrast(110%)");
    ctx.filter = parts.join(" ");

    ctx.drawImage(image, 0, 0);

    // Watermark
    if (adj.watermark.trim()) {
      ctx.filter = "none";
      const fontSize = Math.max(20, Math.floor(canvas.width / 30));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 2;
      const x = canvas.width - ctx.measureText(adj.watermark).width - 20;
      const y = canvas.height - 20;
      ctx.strokeText(adj.watermark, x, y);
      ctx.fillText(adj.watermark, x, y);
    }
  }, [image, adj]);

  useEffect(() => {
    draw();
  }, [draw]);

  function onFileSelect(f: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => setImage(img);
      img.src = String(ev.target?.result ?? "");
    };
    reader.readAsDataURL(f);
  }

  function onDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "edited.jpg";
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
      <div className="space-y-3">
        {!image ? (
          <Card
            className="flex cursor-pointer flex-col items-center justify-center border-dashed p-12"
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
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            />
            <div className="text-5xl">🖼️</div>
            <p className="mt-3 text-sm">画像を選択して編集を始める</p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded border bg-muted">
            <canvas ref={canvasRef} className="h-auto w-full" />
          </div>
        )}

        {image && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImage(null)}>
              別の画像を選ぶ
            </Button>
            <Button variant="outline" onClick={() => setAdj(INITIAL)}>
              リセット
            </Button>
            <Button onClick={onDownload}>ダウンロード</Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>調整</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SliderRow
            label="明るさ"
            value={adj.brightness}
            onChange={(v) => setAdj({ ...adj, brightness: v })}
          />
          <SliderRow
            label="コントラスト"
            value={adj.contrast}
            onChange={(v) => setAdj({ ...adj, contrast: v })}
          />
          <SliderRow
            label="彩度"
            value={adj.saturation}
            onChange={(v) => setAdj({ ...adj, saturation: v })}
          />
          <div>
            <label className="text-xs font-medium">フィルタ</label>
            <select
              value={adj.filter}
              onChange={(e) => setAdj({ ...adj, filter: e.target.value as Filter })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="none">なし</option>
              <option value="grayscale">モノクロ</option>
              <option value="sepia">セピア</option>
              <option value="vivid">ビビッド</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">透かし</label>
            <Input
              value={adj.watermark}
              onChange={(e) => setAdj({ ...adj, watermark: e.target.value })}
              placeholder="© your name"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={200}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-primary"
      />
    </div>
  );
}
