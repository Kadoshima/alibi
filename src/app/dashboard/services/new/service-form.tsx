"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ServiceForm() {
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
      description: fd.get("description"),
      category: fd.get("category"),
      priceJpy: Number(fd.get("priceJpy")),
      durationMin: Number(fd.get("durationMin")),
      legalNotes: fd.get("legalNotes") || undefined,
    };
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "登録に失敗しました");
      return;
    }
    router.push("/dashboard?submitted=1");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">タイトル</label>
        <Input name="title" required minLength={4} maxLength={120} />
      </div>
      <div>
        <label className="text-sm font-medium">カテゴリ</label>
        <select
          name="category"
          required
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="EMPLOYMENT_VERIFICATION">在籍確認サポート</option>
          <option value="SCHEDULE_COVER">スケジュール調整</option>
          <option value="PROXY_ATTENDANCE">代理出席</option>
          <option value="SURPRISE_PLANNING">サプライズ企画</option>
          <option value="PRIVACY_CONSULT">プライバシー相談</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">説明文</label>
        <Textarea name="description" required rows={6} minLength={40} maxLength={4000} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">価格 (JPY)</label>
          <Input name="priceJpy" type="number" min="500" max="500000" required />
        </div>
        <div>
          <label className="text-sm font-medium">所要時間 (分)</label>
          <Input name="durationMin" type="number" min="15" max="600" required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">法的注意事項（任意）</label>
        <Textarea name="legalNotes" rows={3} maxLength={2000} />
      </div>
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "送信中..." : "審査に提出"}
      </Button>
    </form>
  );
}
