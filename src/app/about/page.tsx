export const metadata = { title: "About / 特定商取引法に基づく表記" };

export default function AboutPage() {
  return (
    <article className="container prose prose-slate max-w-3xl py-12 dark:prose-invert">
      <h1>Alibi について</h1>
      <p>
        Alibiは、合法かつ倫理的な目的でのアリバイ関連サービスを提供するマーケットプレイスです。
        私たちは、フリーランスで働く方々の正当な在籍確認、やむを得ない代理出席、
        人生の大切な瞬間のサプライズ演出、プライバシー保護相談など、
        「人が法の範囲で困っている場面」に寄り添う仲介者でありたいと考えています。
      </p>

      <h2>私たちのミッション</h2>
      <p>
        グレーな業界を「合法・審査制・透明性」の三原則で再定義すること。
        全てのサービスは審査を経て公開され、全ての取引は利用目的の申告を必須としています。
      </p>

      <h2 id="company">特定商取引法に基づく表記</h2>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr]">
        <dt className="font-semibold">販売業者</dt>
        <dd>Alibi Platform 株式会社（仮）</dd>
        <dt className="font-semibold">代表責任者</dt>
        <dd>—</dd>
        <dt className="font-semibold">所在地</dt>
        <dd>請求があった場合、遅滞なく開示します。</dd>
        <dt className="font-semibold">電話番号</dt>
        <dd>請求があった場合、遅滞なく開示します。</dd>
        <dt className="font-semibold">メールアドレス</dt>
        <dd>support@alibi.example.com</dd>
        <dt className="font-semibold">販売価格</dt>
        <dd>各サービスページに表示</dd>
        <dt className="font-semibold">お支払い方法</dt>
        <dd>クレジットカード決済（Stripe）</dd>
        <dt className="font-semibold">商品引渡時期</dt>
        <dd>予約日時に提供者がサービスを実施</dd>
        <dt className="font-semibold">返品・キャンセル</dt>
        <dd>利用規約第5条に準じます</dd>
      </dl>
    </article>
  );
}
