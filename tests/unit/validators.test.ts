import { describe, it, expect } from "vitest";
import { registerSchema, faceUploadSchema, generationSchema, ticketEditSchema, creditPurchaseSchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    expect(registerSchema.safeParse({
      email: "test@example.com", name: "太郎", password: "pass1234", termsAccepted: true,
    }).success).toBe(true);
  });
  it("rejects weak password", () => {
    expect(registerSchema.safeParse({
      email: "test@example.com", name: "太郎", password: "short", termsAccepted: true,
    }).success).toBe(false);
  });
});

describe("faceUploadSchema", () => {
  it("accepts valid JPEG", () => {
    expect(faceUploadSchema.safeParse({
      filename: "selfie.jpg", mimeType: "image/jpeg", bytes: 500_000,
    }).success).toBe(true);
  });
  it("rejects oversized file", () => {
    expect(faceUploadSchema.safeParse({
      filename: "big.jpg", mimeType: "image/jpeg", bytes: 100_000_000,
    }).success).toBe(false);
  });
});

describe("generationSchema", () => {
  it("accepts valid cuid pair", () => {
    expect(generationSchema.safeParse({
      templateId: "clx2pd1aj0000008l6hwm9wcg",
      facePhotoId: "clx2pd1aj0000008l6hwm9wcg",
    }).success).toBe(true);
  });
});

describe("ticketEditSchema", () => {
  it("accepts valid input", () => {
    expect(ticketEditSchema.safeParse({
      uploadKey: "ticket/123.jpg", bucket: "alibi-private", newDate: "2026/05/01", originalMime: "image/jpeg",
    }).success).toBe(true);
  });
});

describe("creditPurchaseSchema", () => {
  it("accepts valid pack index", () => {
    expect(creditPurchaseSchema.safeParse({ packIndex: 0 }).success).toBe(true);
    expect(creditPurchaseSchema.safeParse({ packIndex: 2 }).success).toBe(true);
  });
  it("rejects out of range", () => {
    expect(creditPurchaseSchema.safeParse({ packIndex: 5 }).success).toBe(false);
  });
});
