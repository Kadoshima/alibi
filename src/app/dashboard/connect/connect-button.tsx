"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConnectButton({
  hasAccount,
  chargesEnabled,
}: {
  hasAccount: boolean;
  chargesEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "接続に失敗しました");
        return;
      }
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  const label = !hasAccount
    ? "Stripe で登録を開始"
    : !chargesEnabled
      ? "オンボーディングを続ける"
      : "アカウント情報を更新";

  return (
    <div>
      <Button onClick={onClick} disabled={loading} size="lg">
        {loading ? "準備中..." : label}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
