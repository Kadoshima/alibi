"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJpy } from "@/lib/utils";

type Props = {
  serviceId: string;
  priceJpy: number;
  providerName: string;
};

export function BookingForm({ serviceId, priceJpy, providerName }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      serviceId,
      scheduledFor: fd.get("scheduledFor"),
      purpose: fd.get("purpose"),
      purposeConsent: fd.get("purposeConsent") === "on",
      notes: fd.get("notes") || undefined,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "予約に失敗しました");
        return;
      }
      router.push(`/dashboard/bookings/${data.id}`);
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ご予約内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="scheduledFor" className="text-sm font-medium">
              希望日時
            </label>
            <Input
              id="scheduledFor"
              name="scheduledFor"
              type="datetime-local"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="purpose" className="text-sm font-medium">
              利用目的 <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="purpose"
              name="purpose"
              required
              rows={5}
              placeholder="例: フリーランスとして賃貸契約の在籍確認対応をお願いしたい。実際の業務委託契約書があります。"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              ※ 20文字以上で具体的に記載してください。虚偽や違法な用途と判断された場合、予約は無効となります。
            </p>
          </div>
          <div>
            <label htmlFor="notes" className="text-sm font-medium">
              補足事項（任意）
            </label>
            <Textarea id="notes" name="notes" rows={3} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="purposeConsent"
              required
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              上記の利用目的が合法であり、配偶者・雇用主・取引先・行政機関等を欺く意図がないことを誓約します。
              虚偽申告が判明した場合、予約の無効・アカウント停止・法的手続きが取られる場合があることに同意します。
            </span>
          </label>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          提供者: <strong>{providerName}</strong>
          <div className="text-lg font-bold text-foreground">{formatJpy(priceJpy)}</div>
        </div>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "送信中..." : "予約を確定して支払いへ"}
        </Button>
      </div>
    </form>
  );
}
