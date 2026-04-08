import { describe, it, expect } from "vitest";
import { bookingCreateSchema, registerSchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      name: "山田太郎",
      password: "password123",
      termsAccepted: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects weak password", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      name: "山田",
      password: "short",
      termsAccepted: true,
    });
    expect(res.success).toBe(false);
  });

  it("requires terms acceptance", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      name: "山田",
      password: "password123",
      termsAccepted: false,
    });
    expect(res.success).toBe(false);
  });
});

describe("bookingCreateSchema", () => {
  const base = {
    serviceId: "clx2pd1aj0000008l6hwm9wcg",
    scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
    purpose: "フリーランスの賃貸契約のため実態確認のサポートをお願いしたい。",
    purposeConsent: true,
  };

  it("accepts legitimate purpose", () => {
    expect(bookingCreateSchema.safeParse(base).success).toBe(true);
  });

  it("rejects past date", () => {
    const res = bookingCreateSchema.safeParse({
      ...base,
      scheduledFor: new Date(Date.now() - 86_400_000).toISOString(),
    });
    expect(res.success).toBe(false);
  });

  it("blocks prohibited keywords", () => {
    const res = bookingCreateSchema.safeParse({
      ...base,
      purpose: "配偶者に対する不倫を隠すために利用したいです。よろしくお願いします。",
    });
    expect(res.success).toBe(false);
  });

  it("requires purpose consent", () => {
    const res = bookingCreateSchema.safeParse({
      ...base,
      purposeConsent: false,
    });
    expect(res.success).toBe(false);
  });
});
