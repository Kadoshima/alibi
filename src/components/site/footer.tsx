import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container py-10 text-sm">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 font-semibold">Alibi</h3>
            <p className="text-muted-foreground">
              AI顔合成とチケット日付編集で、自然なアリバイ素材を作れるサービス。
              領収書・レシートの加工は禁止しています。
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">機能</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/generate">AI 顔合成</Link></li>
              <li><Link href="/ticket-edit">チケット日付編集</Link></li>
              <li><Link href="/pricing">料金プラン</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">法的情報</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/legal/terms">利用規約</Link></li>
              <li><Link href="/legal/privacy">プライバシーポリシー</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">お問い合わせ</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-muted-foreground">
          © {new Date().getFullYear()} Alibi. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
