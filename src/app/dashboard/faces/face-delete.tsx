"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FaceDelete({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("この顔写真を削除しますか？")) return;
    setLoading(true);
    await fetch(`/api/face-photos/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={onDelete} disabled={loading}>
      {loading ? "..." : "削除"}
    </Button>
  );
}
