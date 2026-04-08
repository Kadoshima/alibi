import Stripe from "stripe";

// Lazy-init so missing keys don't crash non-payment code paths (tests, builds).
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(key, {
    apiVersion: "2024-09-30.acacia",
    typescript: true,
  });
  return cached;
}
