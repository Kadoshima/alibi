import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  cancelledReason: z.string().max(1000).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { service: true, payment: true, customer: true, provider: true },
  });
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner =
    booking.customerId === session.user.id || booking.providerId === session.user.id;
  if (!isOwner && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(booking);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isProvider = booking.providerId === session.user.id;
  const isCustomer = booking.customerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  const allowed: Record<string, boolean> = {
    CONFIRMED: isProvider || isAdmin,
    IN_PROGRESS: isProvider || isAdmin,
    COMPLETED: isProvider || isAdmin,
    CANCELLED: isCustomer || isProvider || isAdmin,
  };
  if (!allowed[parsed.data.status]) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      cancelledReason: parsed.data.cancelledReason,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : booking.completedAt,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: `BOOKING_${parsed.data.status}`,
    target: updated.id,
  });

  return NextResponse.json({ ok: true, booking: updated });
}
