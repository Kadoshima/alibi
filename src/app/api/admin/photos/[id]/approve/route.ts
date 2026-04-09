import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const photo = await prisma.photo.update({
    where: { id: params.id },
    data: {
      status: "ACTIVE",
      approvedAt: new Date(),
      rejectedReason: null,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "PHOTO_APPROVED",
    target: photo.id,
  });

  return NextResponse.json({ ok: true });
}
