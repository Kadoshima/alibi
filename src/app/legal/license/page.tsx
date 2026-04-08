export const metadata = { title: "ライセンス条項" };

export default function LicensePage() {
  return (
    <article className="container prose prose-slate max-w-3xl py-12 dark:prose-invert">
      <h1>ライセンス条項</h1>
      <p>
        Alibi Photo Market で販売される写真には、以下のいずれかのライセンスが適用されます。
        クリエイターは出品時に「許可する最大ライセンス」を設定でき、購入者はその範囲で選択できます。
      </p>

      <h2>個人利用 (PERSONAL)</h2>
      <ul>
        <li>✅ 個人 SNS 投稿、私的な印刷、個人ブログへの掲載</li>
        <li>✅ 壁紙、プレゼント、アルバム</li>
        <li>❌ 商用利用・広告・販売・配布は不可</li>
        <li>❌ 再販・ロゴ化・テンプレート化は不可</li>
      </ul>
      <p>価格: ベース価格 x1</p>

      <h2>商用利用 (COMMERCIAL)</h2>
      <ul>
        <li>✅ 個人利用の全範囲</li>
        <li>✅ 企業 Web サイト、広告、商品パッケージ、販促資料</li>
        <li>✅ 有料メディア記事、プレゼン資料</li>
        <li>❌ 再販・テンプレート化は不可</li>
      </ul>
      <p>価格: ベース価格 x3</p>

      <h2>拡張商用 (EXTENDED)</h2>
      <ul>
        <li>✅ 商用利用の全範囲</li>
        <li>✅ 再販・テンプレート販売・NFT 化</li>
        <li>✅ 大量配布(1万部超の印刷、大規模キャンペーン)</li>
      </ul>
      <p>価格: ベース価格 x6</p>

      <h2>共通事項</h2>
      <ul>
        <li>ダウンロードは購入毎に最大5回まで</li>
        <li>クレジット表記は任意(ただし推奨)</li>
        <li>人物を特定可能な形での使用、人物に対する名誉毀損的な使用は禁止</li>
        <li>違法・反社会的な用途(詐欺、差別、暴力助長)への使用は禁止</li>
      </ul>
    </article>
  );
}
