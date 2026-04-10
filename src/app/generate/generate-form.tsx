"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Template = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  premium: boolean;
  thumbUrl: string;
};

type FacePhoto = {
  id: string;
  label: string;
};

type Props = {
  templates: Template[];
  facePhotos: FacePhoto[];
  credits: number;
};

export function GenerateForm({ templates, facePhotos, credits }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFace, setSelectedFace] = useState<string | null>(
    facePhotos[0]?.id ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  const filtered = category
    ? templates.filter((t) => t.category === category)
    : templates;

  const selected = templates.find((t) => t.id === selectedTemplate);
  const cost = selected?.premium ? 2 : 1;

  async function onGenerate() {
    if (!selectedTemplate || !selectedFace) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: selectedTemplate,
        facePhotoId: selectedFace,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "生成に失敗しました");
      return;
    }
    router.push(`/dashboard/history/${data.id}`);
  }

  const categories = [...new Set(templates.map((t) => t.category))];

  return (
    <div className="mt-6 space-y-6">
      {/* Face photo selector */}
      {facePhotos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold">1. 顔写真を選択</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {facePhotos.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFace(f.id)}
                className={`rounded-md border px-4 py-2 text-sm ${
                  selectedFace === f.id
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-input hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter + Template grid */}
      <div>
        <h2 className="text-lg font-semibold">2. テンプレートを選択</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded px-3 py-1 text-sm ${!category ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}
          >
            すべて
          </button>
          {categories.map((c) => {
            const label = templates.find((t) => t.category === c)?.categoryLabel ?? c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded px-3 py-1 text-sm ${category === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer overflow-hidden transition ${
                selectedTemplate === t.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "hover:border-primary"
              }`}
              onClick={() => setSelectedTemplate(t.id)}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.thumbUrl}
                  alt={t.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {t.premium && (
                  <Badge className="absolute right-2 top-2" variant="default">
                    2CR
                  </Badge>
                )}
              </div>
              <CardContent className="p-2">
                <div className="text-sm font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.categoryLabel}</div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              テンプレートがありません
            </p>
          )}
        </div>
      </div>

      {/* Generate button */}
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div className="text-sm">
          {selected ? (
            <>
              選択中: <strong>{selected.title}</strong> ({cost}クレジット)
            </>
          ) : (
            "テンプレートを選択してください"
          )}
        </div>
        <Button
          size="lg"
          disabled={!selectedTemplate || !selectedFace || loading || credits < cost}
          onClick={onGenerate}
        >
          {loading ? "生成中..." : `生成する (${cost}CR)`}
        </Button>
      </div>
    </div>
  );
}
