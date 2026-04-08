import { describe, it, expect } from "vitest";
import { formatJpy, slugify, cn } from "@/lib/utils";

describe("formatJpy", () => {
  it("formats JPY as currency", () => {
    expect(formatJpy(1000)).toContain("1,000");
    expect(formatJpy(0)).toContain("0");
  });
});

describe("slugify", () => {
  it("creates url-safe slugs", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
  it("preserves japanese characters", () => {
    expect(slugify("代理出席 サポート")).toBe("代理出席-サポート");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b", { c: true, d: false })).toBe("a b c");
  });
});
