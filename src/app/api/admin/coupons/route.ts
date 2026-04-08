import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  code: z.string().min(3).max(40).regex(/^[A-Z0-9_-]+$/),
  kind: z.enum(["PERCENT", "FIXED"]),
  percentBps: z.number().int().min(1).max(10000).optional(),
  valueJpy: z.number().int().min(1).max(1_000_000).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  validUntil: z.coerce.date().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }
  if (parsed.data.kind === "PERCENT" && !parsed.data.percentBps) {
    return NextResponse.json({ error: "割引率を指定してください" }, { status: 400 });
  }
  if (parsed.data.kind === "FIXED" && !parsed.data.valueJpy) {
    return NextResponse.json({ error: "割引額を指定してください" }, { status: 400 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: parsed.data.code,
      kind: parsed.data.kind,
      percentBps: parsed.data.percentBps,
      valueJpy: parsed.data.valueJpy,
      maxRedemptions: parsed.data.maxRedemptions,
      validUntil: parsed.data.validUntil,
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "COUPON_CREATED",
    target: coupon.code,
  });
  return NextResponse.json({ ok: true, coupon });
}
