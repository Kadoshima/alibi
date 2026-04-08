export const metadata = { title: "About / 特定商取引法に基づく表記" };

export default function AboutPage() {
  return (
    <article className="container prose prose-slate max-w-3xl py-12 dark:prose-invert">
      <h1>Alibi Photo Market について</h1>
      <p>
        Alibi は、クリエイターとユーザーが安心して写真を取引できる
        <strong>プライバシー配慮型の写真マーケットプレイス</strong>です。
      </p>

      <h2>私たちが解決する課題</h2>
      <ul>
        <li>
          <strong>EXIF の事故</strong> —
          一般的なストックサイトは位置情報を自動削除してくれない。Alibi は全て自動処理。
        </li>
        <li>
          <strong>顔が写り込む問題</strong> —
          通行人や背景の人物が写っていても、ぼかし候補を自動提示して安全に公開できる。
        </li>
        <li>
          <strong>クリエイター取り分が低い</strong> —
          業界平均50%前後に対し、Alibi は80%をクリエイターに還元。
        </li>
        <li>
          <strong>編集ツールが別途必要</strong> —
          Studio をブラウザで無料提供。インストール不要。
        </li>
      </ul>

      <h2 id="company">特定商取引法に基づく表記</h2>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-[200px_1fr]">
        <dt className="font-semibold">販売業者</dt>
        <dd>Alibi Photo Market 株式会社(仮称)</dd>
        <dt className="font-semibold">代表責任者</dt>
        <dd>—</dd>
        <dt className="font-semibold">所在地</dt>
        <dd>請求があった場合、遅滞なく開示します。</dd>
        <dt className="font-semibold">電話番号</dt>
        <dd>請求があった場合、遅滞なく開示します。</dd>
        <dt className="font-semibold">メールアドレス</dt>
        <dd>support@alibi.example.com</dd>
        <dt className="font-semibold">販売価格</dt>
        <dd>各写真詳細ページに表示(税込)</dd>
        <dt className="font-semibold">お支払い方法</dt>
        <dd>クレジットカード決済(Stripe)</dd>
        <dt className="font-semibold">商品の引渡</dt>
        <dd>決済完了後、ダウンロード画面にて即時引渡</dd>
        <dt className="font-semibold">返品・キャンセル</dt>
        <dd>
          デジタルコンテンツの性質上、ダウンロード後の返金は原則不可。
          重大な欠陥・権利侵害の場合は全額返金。
        </dd>
      </dl>
    </article>
  );
}
