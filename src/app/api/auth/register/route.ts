import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

const extendedSchema = registerSchema.and(
  z.object({ referralCode: z.string().max(40).optional() }),
);

function generateReferralCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = extendedSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力が不正です", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, name, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let referredById: string | null = null;
  if (parsed.data.referralCode) {
    const ref = await prisma.user.findUnique({
      where: { referralCode: parsed.data.referralCode },
    });
    referredById = ref?.id ?? null;
  }

  // Ensure uniqueness of generated referral code.
  let referralCode = generateReferralCode();
  for (let i = 0; i < 5; i += 1) {
    const clash = await prisma.user.findUnique({ where: { referralCode } });
    if (!clash) break;
    referralCode = generateReferralCode();
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      termsAcceptedAt: new Date(),
      referralCode,
      referredById,
    },
    select: { id: true, email: true, name: true, referralCode: true },
  });

  await writeAudit({
    userId: user.id,
    action: "USER_REGISTERED",
    target: user.id,
  });

  return NextResponse.json({ ok: true, user });
}
