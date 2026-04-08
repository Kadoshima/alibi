import { describe, it, expect } from "vitest";
import { isCouponRedeemable } from "@/lib/pricing";

describe("isCouponRedeemable", () => {
  const base = {
    code: "TEST",
    kind: "PERCENT" as const,
    valueJpy: null,
    percentBps: 1000,
    maxRedemptions: null as number | null,
    redeemedCount: 0,
    validFrom: null as Date | null,
    validUntil: null as Date | null,
    active: true,
    createdAt: new Date(),
  };

  it("returns true for an active coupon with no limits", () => {
    expect(isCouponRedeemable(base)).toBe(true);
  });

  it("returns false when inactive", () => {
    expect(isCouponRedeemable({ ...base, active: false })).toBe(false);
  });

  it("returns false when expired", () => {
    expect(
      isCouponRedeemable({
        ...base,
        validUntil: new Date(Date.now() - 1000),
      }),
    ).toBe(false);
  });

  it("returns false when not yet valid", () => {
    expect(
      isCouponRedeemable({
        ...base,
        validFrom: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(false);
  });

  it("returns false when max redemptions reached", () => {
    expect(
      isCouponRedeemable({
        ...base,
        maxRedemptions: 5,
        redeemedCount: 5,
      }),
    ).toBe(false);
  });
});
