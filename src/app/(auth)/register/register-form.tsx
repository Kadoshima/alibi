"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      termsAccepted: fd.get("termsAccepted") === "on",
    };
    const res = await fetch("/api/auth/register", {
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
    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium" htmlFor="name">
          氏名
        </label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="email">
          メールアドレス
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="password">
          パスワード
        </label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted-foreground">
          8文字以上・英字と数字を含めてください
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="termsAccepted" required className="mt-1" />
        <span>
          <a href="/legal/terms" className="text-primary underline" target="_blank">
            利用規約
          </a>
          および
          <a href="/legal/privacy" className="ml-1 text-primary underline" target="_blank">
            プライバシーポリシー
          </a>
          に同意します
        </span>
      </label>
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登録中..." : "登録"}
      </Button>
    </form>
  );
}
