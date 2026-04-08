"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CouponCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"PERCENT" | "FIXED">("PERCENT");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      code: (fd.get("code") as string).toUpperCase(),
      kind,
      percentBps: kind === "PERCENT" ? Number(fd.get("percent")) * 100 : undefined,
      valueJpy: kind === "FIXED" ? Number(fd.get("value")) : undefined,
      maxRedemptions: fd.get("max") ? Number(fd.get("max")) : undefined,
      validUntil: fd.get("validUntil") || undefined,
    };
    const res = await fetch("/api/admin/coupons", {
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
    router.refresh();
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <Input name="code" placeholder="コード (例: LAUNCH10)" required className="md:col-span-1" />
      <select
        name="kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as "PERCENT" | "FIXED")}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="PERCENT">割合 (%)</option>
        <option value="FIXED">固定額 (JPY)</option>
      </select>
      {kind === "PERCENT" ? (
        <Input name="percent" type="number" placeholder="割引%" min="1" max="100" required />
      ) : (
        <Input name="value" type="number" placeholder="割引額 (円)" min="1" required />
      )}
      <Input name="max" type="number" placeholder="利用上限（任意）" />
      <Input name="validUntil" type="date" />
      <Button type="submit" disabled={loading}>
        {loading ? "作成中..." : "発行"}
      </Button>
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive md:col-span-3">
          {error}
        </div>
      )}
    </form>
  );
}
