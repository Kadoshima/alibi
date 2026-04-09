import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Stripe Webhook handler for Photo marketplace purchases.
 *
 * Events of interest:
 *  - checkout.session.completed  → PhotoPurchase PAID + Earning credit
 *  - payment_intent.payment_failed → PhotoPurchase FAILED
 *  - charge.refunded → PhotoPurchase REFUNDED + Earning reversal
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "invalid";
    return NextResponse.json({ error: `signature: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const purchaseId = session.metadata?.purchaseId;
      if (!purchaseId) break;

      const purchase = await prisma.photoPurchase.findUnique({
        where: { id: purchaseId },
        include: { photo: { select: { ownerId: true, title: true } } },
      });
      if (!purchase) break;

      await prisma.$transaction([
        prisma.photoPurchase.update({
          where: { id: purchaseId },
          data: { status: "PAID", paidAt: new Date() },
        }),
        prisma.payment.update({
          where: { purchaseId },
          data: {
            status: "CAPTURED",
            stripePaymentIntentId: (session.payment_intent as string | null) ?? undefined,
          },
        }),
        prisma.earning.create({
          data: {
            userId: purchase.photo.ownerId,
            amountJpy: purchase.creatorEarningsJpy,
            source: "SALE",
            sourceId: purchase.id,
            status: "AVAILABLE",
            note: `Photo sale: ${purchase.photo.title}`,
          },
        }),
      ]);

      await writeAudit({
        action: "PURCHASE_PAID",
        target: purchaseId,
        metadata: { amountJpy: purchase.grossJpy - purchase.discountJpy },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: "FAILED" },
      });
      break;
    }

    case "account.updated": {
      // Stripe Connect: sync charges_enabled/payouts_enabled on our side.
      const account = event.data.object as Stripe.Account;
      await prisma.user
        .updateMany({
          where: { stripeConnectAccountId: account.id },
          data: {
            stripeConnectChargesEnabled: account.charges_enabled ?? false,
            stripeConnectPayoutsEnabled: account.payouts_enabled ?? false,
          },
        })
        .catch(() => null);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (!charge.payment_intent) break;
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: charge.payment_intent as string },
        include: { purchase: true },
      });
      if (!payment) break;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED", refundedJpy: charge.amount_refunded },
        }),
        prisma.photoPurchase.update({
          where: { id: payment.purchase.id },
          data: { status: "REFUNDED" },
        }),
        // Earning を相殺
        prisma.earning.create({
          data: {
            userId: (await prisma.photo.findUniqueOrThrow({
              where: { id: payment.purchase.photoId },
              select: { ownerId: true },
            })).ownerId,
            amountJpy: -payment.purchase.creatorEarningsJpy,
            source: "ADJUSTMENT",
            sourceId: payment.purchase.id,
            status: "AVAILABLE",
            note: "Refund adjustment",
          },
        }),
      ]);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
