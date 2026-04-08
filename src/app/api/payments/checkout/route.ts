import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { writeAudit } from "@/lib/audit";

const schema = z.object({ bookingId: z.string().cuid() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { service: true, payment: true },
  });
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (booking.customerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (booking.payment && booking.payment.status !== "PENDING" && booking.payment.status !== "FAILED") {
    return NextResponse.json({ error: "already paid" }, { status: 400 });
  }

  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: booking.totalJpy,
          product_data: {
            name: booking.service.title,
            description: `予約ID: ${booking.id}`,
          },
        },
      },
    ],
    metadata: { bookingId: booking.id },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${booking.id}?paid=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${booking.id}?cancelled=1`,
  });

  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: { stripePaymentIntentId: checkout.payment_intent as string | null, status: "PENDING" },
    create: {
      bookingId: booking.id,
      amountJpy: booking.totalJpy,
      status: "PENDING",
      stripePaymentIntentId: checkout.payment_intent as string | null,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "CHECKOUT_CREATED",
    target: booking.id,
  });

  return NextResponse.json({ url: checkout.url });
}
