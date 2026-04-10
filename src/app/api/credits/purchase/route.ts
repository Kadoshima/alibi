import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creditPurchaseSchema } from "@/lib/validators";
import { CREDIT_PACKS } from "@/lib/credits";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = creditPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const pack = CREDIT_PACKS[parsed.data.packIndex];
  if (!pack) {
    return NextResponse.json({ error: "無効なパック" }, { status: 400 });
  }

  const purchase = await prisma.creditPurchase.create({
    data: {
      userId: session.user.id,
      credits: pack.credits,
      amountJpy: pack.priceJpy,
      status: "PENDING",
    },
  });

  let checkoutUrl: string;
  try {
    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: pack.priceJpy,
            product_data: {
              name: `Alibi クレジット ${pack.label}`,
              description: `${pack.credits} クレジット`,
            },
          },
        },
      ],
      metadata: {
        creditPurchaseId: purchase.id,
        userId: session.user.id,
        credits: String(pack.credits),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits_purchased=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=1`,
    });
    checkoutUrl = checkout.url!;
    await prisma.creditPurchase.update({
      where: { id: purchase.id },
      data: { stripeCheckoutSessionId: checkout.id },
    });
  } catch {
    checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?pending=${purchase.id}`;
  }

  return NextResponse.json({ url: checkoutUrl });
}
