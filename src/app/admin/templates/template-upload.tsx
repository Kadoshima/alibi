"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORIES = [
  "CINEMA","RESTAURANT","BAR","CAFE","TRAVEL",
  "SPORTS","SHOPPING","OUTDOOR","EVENT","OTHER",
];

export function TemplateUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      slug: fd.get("slug"),
      category: fd.get("category"),
      description: fd.get("description") || undefined,
      premium: fd.get("premium") === "on",
    };
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "作成に失敗しました");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>新規テンプレート登録</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
          <Input name="title" placeholder="タイトル" required />
          <Input name="slug" placeholder="slug (英数字)" required />
          <select
            name="category"
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Input name="description" placeholder="説明 (任意)" className="md:col-span-2" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="premium" /> Premium (2CR)
          </label>
          <Button type="submit" disabled={loading} className="md:col-span-3">
            {loading ? "登録中..." : "登録(画像はS3に手動アップロード)"}
          </Button>
          {error && <p className="text-sm text-destructive md:col-span-3">{error}</p>}
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          ※ MVPではテンプレート画像はS3に手動でアップロードしてください。
          キーは templates/&#123;slug&#125;.jpg / templates/thumbs/&#123;slug&#125;.webp です。
        </p>
      </CardContent>
    </Card>
  );
}
