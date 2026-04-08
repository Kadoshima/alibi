import Link from "next/link";
import { getOptionalUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const user = await getOptionalUser();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="rounded bg-primary px-2 py-1 text-primary-foreground">Alibi</span>
          <span className="hidden text-sm font-normal text-muted-foreground sm:inline">
            Photo Market
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/photos" className="rounded px-3 py-2 hover:bg-accent">
            写真を探す
          </Link>
          <Link href="/studio" className="rounded px-3 py-2 hover:bg-accent">
            Studio
          </Link>
          <Link href="/pricing" className="rounded px-3 py-2 hover:bg-accent">
            料金
          </Link>
          {user ? (
            <>
              <Link href="/upload">
                <Button size="sm" variant="outline">
                  出品する
                </Button>
              </Link>
              <Link href="/dashboard" className="rounded px-3 py-2 hover:bg-accent">
                マイページ
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="rounded px-3 py-2 hover:bg-accent">
                  管理
                </Link>
              )}
              <form action="/api/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit">
                  ログアウト
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  ログイン
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">新規登録</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
