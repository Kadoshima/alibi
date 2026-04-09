import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purchaseCreateSchema } from "@/lib/validators";
import { calculatePhotoPrice } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { writeAudit } from "@/lib/audit";
import { canUseDirectTransfer } from "@/lib/stripe-connect";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = purchaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }

  const photo = await prisma.photo.findUnique({
    where: { id: parsed.data.photoId },
    include: {
      owner: {
        select: {
          id: true,
          stripeConnectAccountId: true,
          stripeConnectChargesEnabled: true,
        },
      },
    },
  });
  if (!photo || photo.status !== "ACTIVE") {
    return NextResponse.json({ error: "販売されていない写真です" }, { status: 404 });
  }
  if (photo.ownerId === session.user.id) {
    return NextResponse.json({ error: "自身の写真は購入できません" }, { status: 400 });
  }

  let price;
  try {
    price = await calculatePhotoPrice({
      photoId: photo.id,
      licenseKind: parsed.data.licenseKind,
      couponCode: parsed.data.couponCode,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "価格計算エラー" },
      { status: 400 },
    );
  }

  // Create pending purchase + payment
  const purchase = await prisma.photoPurchase.create({
    data: {
      buyerId: session.user.id,
      photoId: photo.id,
      licenseKind: parsed.data.licenseKind,
      grossJpy: price.grossJpy,
      discountJpy: price.discountJpy,
      platformFeeJpy: price.platformFeeJpy,
      creatorEarningsJpy: price.creatorEarningsJpy,
      couponCode: price.couponCode,
      status: "PENDING",
      payment: {
        create: {
          amountJpy: price.totalJpy,
          status: "PENDING",
        },
      },
    },
  });

  // Stripe Checkout — uses Connect direct transfer when creator is onboarded
  let checkoutUrl: string | null = null;
  const useDirectTransfer = canUseDirectTransfer(photo.owner);

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
            unit_amount: price.totalJpy,
            product_data: {
              name: photo.title,
              description: `License: ${parsed.data.licenseKind}`,
            },
          },
        },
      ],
      metadata: {
        purchaseId: purchase.id,
        photoId: photo.id,
        creatorId: photo.ownerId,
        transferMode: useDirectTransfer ? "connect" : "platform",
      },
      // When the creator has completed Stripe Connect onboarding, let Stripe
      // handle the split automatically (application_fee_amount + transfer_data).
      // Otherwise keep the full amount on the platform balance and settle via
      // the Earning ledger (manual payout later).
      ...(useDirectTransfer
        ? {
            payment_intent_data: {
              application_fee_amount: price.platformFeeJpy,
              transfer_data: {
                destination: photo.owner.stripeConnectAccountId!,
              },
            },
          }
        : {}),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/purchases?paid=${purchase.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/photos/${photo.slug}?cancelled=1`,
    });
    checkoutUrl = checkout.url;

    await prisma.payment.update({
      where: { purchaseId: purchase.id },
      data: { stripeCheckoutSessionId: checkout.id },
    });
  } catch (err) {
    // Stripeキー未設定時は購入IDのみ返して、E2E用のフォールバックパスを通す
    console.warn("[stripe] checkout error:", err);
    checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/purchases?pending=${purchase.id}`;
  }

  await prisma.analyticsEvent
    .create({
      data: {
        userId: session.user.id,
        event: "purchase_started",
        props: { photoId: photo.id, totalJpy: price.totalJpy, licenseKind: parsed.data.licenseKind },
      },
    })
    .catch(() => null);

  await writeAudit({
    userId: session.user.id,
    action: "PURCHASE_STARTED",
    target: purchase.id,
  });

  return NextResponse.json({
    ok: true,
    purchaseId: purchase.id,
    checkoutUrl,
  });
}
