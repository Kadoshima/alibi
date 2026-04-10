export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="container prose prose-slate max-w-3xl py-12 dark:prose-invert">
      <h1>Alibi について</h1>
      <p>
        Alibi は、サプライズの準備中や断りにくい誘いの場面で使える
        <strong>「アリバイ素材」</strong>を、AIの力で手軽に作れるサービスです。
      </p>
      <h2>何ができるの？</h2>
      <ul>
        <li>自分の顔写真を「映画館にいた」「旅行に行っていた」などのシーンに AI で合成</li>
        <li>チケット画像の日付だけを書き換え</li>
      </ul>
      <h2>何ができないの？</h2>
      <ul>
        <li>領収書・レシート・請求書の加工(脱税防止のため完全ブロック)</li>
        <li>公的書類の偽造</li>
        <li>犯罪や詐欺に使える素材の作成</li>
      </ul>
      <h2 id="company">特定商取引法に基づく表記</h2>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr]">
        <dt className="font-semibold">販売業者</dt><dd>Alibi(仮称)</dd>
        <dt className="font-semibold">メール</dt><dd>support@alibi.example.com</dd>
        <dt className="font-semibold">販売価格</dt><dd>料金プランページに表示(税込)</dd>
        <dt className="font-semibold">お支払い</dt><dd>クレジットカード決済(Stripe)</dd>
        <dt className="font-semibold">返品</dt><dd>デジタルコンテンツのため原則返金不可。生成失敗時はクレジット返還。</dd>
      </dl>
    </article>
  );
}
