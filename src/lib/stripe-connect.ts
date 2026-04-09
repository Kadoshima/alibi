// Stripe Connect helpers (Express accounts for creators).
//
// Flow:
//   1. Creator clicks "Connect with Stripe" → POST /api/stripe/connect/onboard
//      → createOrRetrieveAccount() → createOnboardingLink() → redirect
//   2. Stripe redirects back to /api/stripe/connect/return
//      → refreshAccountStatus() syncs charges_enabled/payouts_enabled
//   3. On purchase: if creator has chargesEnabled, the Checkout Session
//      attaches `transfer_data.destination` + `application_fee_amount`,
//      so Stripe handles the payout split automatically.

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function createOrRetrieveAccount(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: "JP",
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectAccountId: account.id },
  });

  return account.id;
}

export async function createOnboardingLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard/connect?refresh=1`,
    return_url: `${base}/api/stripe/connect/return`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function refreshAccountStatus(userId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.stripeConnectAccountId) {
    return { chargesEnabled: false, payoutsEnabled: false };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeConnectChargesEnabled: chargesEnabled,
      stripeConnectPayoutsEnabled: payoutsEnabled,
    },
  });

  return { chargesEnabled, payoutsEnabled };
}

/**
 * Given a creator user, decide whether a purchase should be split via
 * Stripe Connect (direct transfer) or held on the platform balance (ledger).
 */
export function canUseDirectTransfer(user: {
  stripeConnectAccountId: string | null;
  stripeConnectChargesEnabled: boolean;
}): boolean {
  return Boolean(user.stripeConnectAccountId && user.stripeConnectChargesEnabled);
}
