import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(8).max(20),
});

// MVP スタブ: 本番では外部プロバイダに委任。ここでは即座に PENDING → APPROVED に遷移する簡易版。
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      kycStatus: "APPROVED",
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "KYC_APPROVED_STUB",
  });

  return NextResponse.json({ ok: true });
}
