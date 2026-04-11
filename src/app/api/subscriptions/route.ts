import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  plan: z.enum(["PRO", "UNLIMITED"]),
});

// Stripe Price IDs are configured via env. MVPでは stub。
const PRICE_IDS: Record<string, string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  UNLIMITED: process.env.STRIPE_PRICE_UNLIMITED,
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

  const priceId = PRICE_IDS[parsed.data.plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "サブスクリプションは準備中です。都度購入をご利用ください。" },
      { status: 501 },
    );
  }

  try {
    const stripe = getStripe();

    // Ensure Stripe customer
    let customerId = (
      await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { stripeCustomerId: true },
      })
    )?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: session.user.id, plan: parsed.data.plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=1`,
    });

    await writeAudit({
      userId: session.user.id,
      action: "SUBSCRIPTION_CHECKOUT_STARTED",
      metadata: { plan: parsed.data.plan },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "subscription failed" },
      { status: 500 },
    );
  }
}
