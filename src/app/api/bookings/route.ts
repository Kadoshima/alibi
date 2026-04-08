import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingCreateSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";
import { calculateBookingPrice } from "@/lib/pricing";

const bookingWithCouponSchema = bookingCreateSchema.and(
  z.object({ couponCode: z.string().max(40).optional() }),
);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (session.user.kycStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "本人確認（KYC）が必要です" },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bookingWithCouponSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
  });
  if (!service || service.status !== "ACTIVE") {
    return NextResponse.json({ error: "利用できないサービスです" }, { status: 404 });
  }
  if (service.providerId === session.user.id) {
    return NextResponse.json({ error: "自身のサービスは予約できません" }, { status: 400 });
  }

  const price = await calculateBookingPrice({
    serviceId: service.id,
    couponCode: parsed.data.couponCode,
  });

  const booking = await prisma.booking.create({
    data: {
      customerId: session.user.id,
      providerId: service.providerId,
      serviceId: service.id,
      scheduledFor: parsed.data.scheduledFor,
      purpose: parsed.data.purpose,
      purposeConsent: parsed.data.purposeConsent,
      notes: parsed.data.notes,
      subtotalJpy: price.subtotalJpy,
      discountJpy: price.discountJpy,
      platformFeeJpy: price.platformFeeJpy,
      totalJpy: price.totalJpy,
      couponCode: price.couponCode,
      status: "PENDING",
    },
  });

  // Increment coupon usage (best-effort)
  if (price.couponCode) {
    await prisma.coupon
      .update({
        where: { code: price.couponCode },
        data: { redeemedCount: { increment: 1 } },
      })
      .catch(() => null);
  }

  await prisma.analyticsEvent.create({
    data: {
      userId: session.user.id,
      event: "booking_created",
      props: {
        serviceId: service.id,
        totalJpy: booking.totalJpy,
        platformFeeJpy: booking.platformFeeJpy,
        discountJpy: booking.discountJpy,
      },
    },
  }).catch(() => null);

  await writeAudit({
    userId: session.user.id,
    action: "BOOKING_CREATED",
    target: booking.id,
    metadata: { serviceId: service.id, totalJpy: booking.totalJpy },
  });

  return NextResponse.json({ id: booking.id, ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ customerId: session.user.id }, { providerId: session.user.id }],
    },
    include: { service: true, payment: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bookings);
}
