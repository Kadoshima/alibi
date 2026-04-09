"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewActions({
  photoId,
  currentStatus,
}: {
  photoId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: "approve" | "reject" | "suspend" | "reinstate") {
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/admin/photos/${photoId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "reject" ? JSON.stringify({ reason }) : undefined,
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "操作に失敗しました");
      return;
    }
    router.refresh();
    setRejecting(false);
    setReason("");
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {currentStatus === "PENDING_REVIEW" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => call("approve")} disabled={loading !== null}>
            {loading === "approve" ? "処理中..." : "承認して公開"}
          </Button>
          {!rejecting ? (
            <Button variant="outline" onClick={() => setRejecting(true)}>
              却下
            </Button>
          ) : (
            <div className="w-full space-y-2 sm:w-2/3">
              <Textarea
                placeholder="却下理由 (5文字以上)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={reason.length < 5 || loading !== null}
                  onClick={() => call("reject")}
                >
                  却下を確定
                </Button>
                <Button variant="ghost" onClick={() => setRejecting(false)}>
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStatus === "ACTIVE" && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => call("suspend")} disabled={loading !== null}>
            公開停止
          </Button>
        </div>
      )}

      {currentStatus === "SUSPENDED" && (
        <div className="flex gap-2">
          <Button onClick={() => call("reinstate")} disabled={loading !== null}>
            再公開
          </Button>
        </div>
      )}
    </div>
  );
}
