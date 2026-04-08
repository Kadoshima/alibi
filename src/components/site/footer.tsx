import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container py-10 text-sm">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-3 font-semibold">Alibi</h3>
            <p className="text-muted-foreground">
              合法的な目的に限定したアリバイ関連サービスのマーケットプレイスです。
              違法・反社会的な用途への利用は固くお断りしております。
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">サービス</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/services">サービス一覧</Link>
              </li>
              <li>
                <Link href="/services?category=EMPLOYMENT_VERIFICATION">在籍確認サポート</Link>
              </li>
              <li>
                <Link href="/services?category=SURPRISE_PLANNING">サプライズ企画</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">会社情報</h4>
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
                <Link href="/legal/prohibited">禁止事項</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-muted-foreground">
          © {new Date().getFullYear()} Alibi Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
