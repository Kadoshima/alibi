import { describe, it, expect } from "vitest";
import { checkOcrText, checkFilename } from "@/lib/content-filter";

describe("checkOcrText", () => {
  it("allows a ticket text", () => {
    const res = checkOcrText("座席番号 A-12 開演 19:00 全席指定");
    expect(res.allowed).toBe(true);
  });

  it("blocks receipt text with multiple keywords", () => {
    const res = checkOcrText("領収書 合計金額 ¥5,000 消費税 ¥500");
    expect(res.allowed).toBe(false);
    expect(res.matchedKeywords?.length).toBeGreaterThanOrEqual(2);
  });

  it("allows text with only one keyword (low confidence)", () => {
    const res = checkOcrText("本日の合計金額は3000ポイントです");
    // "合計金額" matches but only 1 keyword → allowed
    expect(res.allowed).toBe(true);
  });

  it("blocks invoice-like text", () => {
    const res = checkOcrText("請求書 Invoice No. 12345 小計 ¥10,000");
    expect(res.allowed).toBe(false);
  });
});

describe("checkFilename", () => {
  it("allows ticket filenames", () => {
    expect(checkFilename("movie-ticket-2026.jpg").allowed).toBe(true);
  });

  it("blocks receipt filenames", () => {
    expect(checkFilename("receipt_2026.pdf").allowed).toBe(false);
  });

  it("blocks Japanese receipt filenames", () => {
    expect(checkFilename("領収書_0410.jpg").allowed).toBe(false);
  });
});
