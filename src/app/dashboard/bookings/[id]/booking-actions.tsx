"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  bookingId: string;
  status: string;
  isCustomer: boolean;
  isProvider: boolean;
  canPay: boolean;
};

export function BookingActions({ bookingId, status, isCustomer, isProvider, canPay }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transition(next: string) {
    setLoading(next);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "操作に失敗しました");
      return;
    }
    router.refresh();
  }

  async function startCheckout() {
    setLoading("PAY");
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    setLoading(null);
    const data = await res.json();
    if (!res.ok || !data.url) {
      setError(data.error ?? "決済セッションの作成に失敗しました");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {canPay && status === "PENDING" && (
          <Button onClick={startCheckout} disabled={loading !== null}>
            {loading === "PAY" ? "処理中..." : "お支払いへ進む"}
          </Button>
        )}
        {isProvider && status === "CONFIRMED" && (
          <Button onClick={() => transition("IN_PROGRESS")} disabled={loading !== null}>
            サービス開始
          </Button>
        )}
        {isProvider && status === "IN_PROGRESS" && (
          <Button onClick={() => transition("COMPLETED")} disabled={loading !== null}>
            完了としてマーク
          </Button>
        )}
        {(isCustomer || isProvider) && ["PENDING", "CONFIRMED"].includes(status) && (
          <Button
            variant="outline"
            onClick={() => transition("CANCELLED")}
            disabled={loading !== null}
          >
            キャンセル
          </Button>
        )}
      </div>
    </div>
  );
}
