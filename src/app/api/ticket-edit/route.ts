import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketEditSchema } from "@/lib/validators";
import { spendCredits } from "@/lib/credits";
import { checkFilename } from "@/lib/content-filter";
import { BUCKETS } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

// POST: submit a ticket edit (date replacement)
// MVP: サーバー側ではレコードを作成し、実際の画像編集は
//      クライアント側 Canvas で行い、結果を S3 にアップロードする。
//      将来的にはサーバー側 OCR + inpainting に移行可能。
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ticketEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Content filter: filename check (basic pre-filter)
  const filenameCheck = checkFilename(parsed.data.uploadKey);
  if (!filenameCheck.allowed) {
    return NextResponse.json({ error: filenameCheck.reason }, { status: 400 });
  }

  // Spend 1 credit
  const ok = await spendCredits(session.user.id, 1, "ticket_edit");
  if (!ok) {
    return NextResponse.json({ error: "クレジットが不足しています" }, { status: 402 });
  }

  const edit = await prisma.ticketEdit.create({
    data: {
      userId: session.user.id,
      originalS3Key: parsed.data.uploadKey,
      originalBucket: parsed.data.bucket,
      newDate: parsed.data.newDate,
      creditsUsed: 1,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "TICKET_EDIT_CREATED",
    target: edit.id,
  });

  return NextResponse.json({ id: edit.id, ok: true });
}

// GET: list user's ticket edits
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const edits = await prisma.ticketEdit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(edits);
}
