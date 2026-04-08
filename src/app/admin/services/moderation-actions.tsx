"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ModerationActions({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function call(action: "approve" | "reject") {
    setLoading(true);
    const res = await fetch(`/api/admin/services/${serviceId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "reject" ? JSON.stringify({ reason }) : undefined,
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button onClick={() => call("approve")} disabled={loading}>
        承認
      </Button>
      {!rejecting ? (
        <Button variant="outline" onClick={() => setRejecting(true)}>
          却下
        </Button>
      ) : (
        <div className="flex w-full flex-col gap-2 sm:w-2/3">
          <Textarea
            placeholder="却下理由を入力"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={reason.length < 5 || loading}
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
  );
}
