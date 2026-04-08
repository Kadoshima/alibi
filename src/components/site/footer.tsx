import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container py-10 text-sm">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-3 font-semibold">Alibi Photo Market</h3>
            <p className="text-muted-foreground">
              プライバシー配慮型の写真マーケット。EXIF削除・顔ぼかし・商用ライセンスを一体化。
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">使う</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/photos">写真を探す</Link>
              </li>
              <li>
                <Link href="/studio">Studio(編集ツール)</Link>
              </li>
              <li>
                <Link href="/upload">写真を出品</Link>
              </li>
              <li>
                <Link href="/pricing">料金プラン</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">会社</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/about#company">特定商取引法に基づく表記</Link>
              </li>
              <li>
                <Link href="/contact">お問い合わせ</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">法的情報</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/legal/terms">利用規約</Link>
              </li>
              <li>
                <Link href="/legal/privacy">プライバシーポリシー</Link>
              </li>
              <li>
                <Link href="/legal/license">ライセンス条項</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-muted-foreground">
          © {new Date().getFullYear()} Alibi Photo Market. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
