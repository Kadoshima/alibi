"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatJpy } from "@/lib/utils";

type License = {
  kind: "PERSONAL" | "COMMERCIAL" | "EXTENDED";
  priceJpy: number;
  label: string;
};

type Props = {
  photoId: string;
  basePriceJpy: number;
  availableLicenses: License[];
};

export function PurchaseForm({ photoId, availableLicenses }: Props) {
  const [selected, setSelected] = useState<License["kind"]>(
    availableLicenses[0]?.kind ?? "PERSONAL",
  );
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = availableLicenses.find((l) => l.kind === selected);

  async function onBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId,
          licenseKind: selected,
          couponCode: coupon || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "購入を開始できませんでした");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError("決済URLが取得できませんでした");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {availableLicenses.map((l) => (
          <label
            key={l.kind}
            className={`flex cursor-pointer items-center justify-between rounded border p-3 text-sm ${
              selected === l.kind ? "border-primary bg-primary/5" : "border-input"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="license"
                value={l.kind}
                checked={selected === l.kind}
                onChange={() => setSelected(l.kind)}
                className="accent-primary"
              />
              <span>{l.label}</span>
            </div>
            <span className="font-bold">{formatJpy(l.priceJpy)}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">クーポンコード(任意)</label>
        <Input
          value={coupon}
          onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="例: LAUNCH10"
          className="mt-1"
        />
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button className="w-full" onClick={onBuy} disabled={loading || !chosen}>
        {loading ? "処理中..." : `${formatJpy(chosen?.priceJpy ?? 0)} で購入`}
      </Button>
    </div>
  );
}
