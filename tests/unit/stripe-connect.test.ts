import { describe, it, expect } from "vitest";
import { canUseDirectTransfer } from "@/lib/stripe-connect";

describe("canUseDirectTransfer", () => {
  it("is false without an account id", () => {
    expect(
      canUseDirectTransfer({
        stripeConnectAccountId: null,
        stripeConnectChargesEnabled: false,
      }),
    ).toBe(false);
  });

  it("is false with an account id but charges not enabled", () => {
    expect(
      canUseDirectTransfer({
        stripeConnectAccountId: "acct_123",
        stripeConnectChargesEnabled: false,
      }),
    ).toBe(false);
  });

  it("is true when both present", () => {
    expect(
      canUseDirectTransfer({
        stripeConnectAccountId: "acct_123",
        stripeConnectChargesEnabled: true,
      }),
    ).toBe(true);
  });
});
