import { describe, it, expect } from "vitest";
import { isCouponRedeemable, maxLicenseAllows, LICENSE_MULTIPLIER } from "@/lib/pricing";

describe("LICENSE_MULTIPLIER", () => {
  it("PERSONAL is x1, COMMERCIAL is x3, EXTENDED is x6", () => {
    expect(LICENSE_MULTIPLIER.PERSONAL).toBe(1);
    expect(LICENSE_MULTIPLIER.COMMERCIAL).toBe(3);
    expect(LICENSE_MULTIPLIER.EXTENDED).toBe(6);
  });
});

describe("maxLicenseAllows", () => {
  it("allows PERSONAL when max is PERSONAL", () => {
    expect(maxLicenseAllows("PERSONAL", "PERSONAL")).toBe(true);
  });
  it("disallows COMMERCIAL when max is PERSONAL", () => {
    expect(maxLicenseAllows("PERSONAL", "COMMERCIAL")).toBe(false);
  });
  it("allows PERSONAL and COMMERCIAL when max is COMMERCIAL", () => {
    expect(maxLicenseAllows("COMMERCIAL", "PERSONAL")).toBe(true);
    expect(maxLicenseAllows("COMMERCIAL", "COMMERCIAL")).toBe(true);
    expect(maxLicenseAllows("COMMERCIAL", "EXTENDED")).toBe(false);
  });
  it("allows all when max is EXTENDED", () => {
    expect(maxLicenseAllows("EXTENDED", "PERSONAL")).toBe(true);
    expect(maxLicenseAllows("EXTENDED", "COMMERCIAL")).toBe(true);
    expect(maxLicenseAllows("EXTENDED", "EXTENDED")).toBe(true);
  });
});

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
    expect(isCouponRedeemable({ ...base, validUntil: new Date(Date.now() - 1000) })).toBe(false);
  });

  it("returns false when not yet valid", () => {
    expect(isCouponRedeemable({ ...base, validFrom: new Date(Date.now() + 86_400_000) })).toBe(
      false,
    );
  });

  it("returns false when max redemptions reached", () => {
    expect(isCouponRedeemable({ ...base, maxRedemptions: 5, redeemedCount: 5 })).toBe(false);
  });
});
