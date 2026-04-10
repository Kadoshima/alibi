import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/credits";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

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
      const purchaseId = session.metadata?.creditPurchaseId;
      const userId = session.metadata?.userId;
      const credits = Number(session.metadata?.credits ?? 0);

      if (!purchaseId || !userId || !credits) break;

      await prisma.creditPurchase.update({
        where: { id: purchaseId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          stripePaymentIntentId: (session.payment_intent as string) ?? undefined,
        },
      });

      await addCredits(userId, credits, "purchase", purchaseId);

      await writeAudit({
        userId,
        action: "CREDITS_PURCHASED",
        target: purchaseId,
        metadata: { credits },
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Mark any credit purchase as failed if PI matches
      if (pi.id) {
        await prisma.creditPurchase
          .updateMany({
            where: { stripePaymentIntentId: pi.id },
            data: { status: "FAILED" },
          })
          .catch(() => null);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
