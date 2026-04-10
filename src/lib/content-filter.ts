// Content filter: 領収書・レシートのアップロードをブロックする。
//
// OCR 結果(テキスト)にキーワードが含まれていたら reject する。
// MVP ではキーワードリスト判定。将来的に画像分類モデルに差し替え可能。

const BLOCKED_KEYWORDS_JA = [
  "領収書",
  "レシート",
  "請求書",
  "納品書",
  "見積書",
  "合計金額",
  "小計",
  "税込",
  "税抜",
  "消費税",
  "印紙",
  "収入印紙",
  "源泉徴収",
  "振込先",
  "口座番号",
  "支払証明",
  "精算書",
  "経費",
  "仕入",
  "売上",
  "勘定科目",
];

const BLOCKED_KEYWORDS_EN = [
  "receipt",
  "invoice",
  "bill of sale",
  "tax invoice",
  "payment received",
  "subtotal",
  "total amount",
  "vat",
  "gst",
  "tax amount",
];

const ALL_KEYWORDS = [...BLOCKED_KEYWORDS_JA, ...BLOCKED_KEYWORDS_EN];

export type FilterResult = {
  allowed: boolean;
  reason?: string;
  matchedKeywords?: string[];
};

/**
 * OCR テキストを受け取り、領収書・レシート系のキーワードがあるかチェック。
 * 2つ以上マッチしたら「高確度で領収書/レシート」と判定する。
 */
export function checkOcrText(ocrText: string): FilterResult {
  const lower = ocrText.toLowerCase();
  const matched = ALL_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));

  if (matched.length >= 2) {
    return {
      allowed: false,
      reason:
        "この画像は領収書・レシート・請求書と判定されました。脱税等の不正利用防止のため、これらの書類の加工は禁止されています。",
      matchedKeywords: matched,
    };
  }

  return { allowed: true };
}

/**
 * 画像ファイル名ベースの簡易チェック (OCR 前の事前フィルタ)。
 */
export function checkFilename(filename: string): FilterResult {
  const lower = filename.toLowerCase();
  const suspicious = ["receipt", "invoice", "領収", "レシート", "請求"].some((kw) =>
    lower.includes(kw),
  );
  if (suspicious) {
    return {
      allowed: false,
      reason: "ファイル名に領収書・レシート関連のキーワードが含まれています。",
    };
  }
  return { allowed: true };
}
