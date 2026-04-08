export const metadata = { title: "お問い合わせ" };

export default function ContactPage() {
  return (
    <div className="container max-w-2xl py-12">
      <h1 className="text-3xl font-bold">お問い合わせ</h1>
      <p className="mt-4 text-muted-foreground">
        通報・ご質問・取材等は下記までご連絡ください。
      </p>
      <div className="mt-6 rounded border p-6 text-sm">
        <p>Email: support@alibi.example.com</p>
        <p>不正利用通報: abuse@alibi.example.com</p>
        <p>取材・報道: press@alibi.example.com</p>
      </div>
    </div>
  );
}
