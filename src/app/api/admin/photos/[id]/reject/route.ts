import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const schema = z.object({ reason: z.string().min(5).max(2000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "理由を入力してください(5文字以上)" }, { status: 400 });
  }

  const photo = await prisma.photo.update({
    where: { id: params.id },
    data: {
      status: "SUSPENDED",
      rejectedReason: parsed.data.reason,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "PHOTO_REJECTED",
    target: photo.id,
    metadata: { reason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}
