import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presignDownload } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const purchase = await prisma.photoPurchase.findUnique({
    where: { id: params.id },
    include: {
      photo: { include: { assets: { where: { variant: "ORIGINAL" } } } },
    },
  });
  if (!purchase) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (purchase.buyerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (purchase.status !== "PAID") {
    return NextResponse.json({ error: "購入が完了していません" }, { status: 400 });
  }
  if (purchase.downloadCount >= purchase.maxDownloads) {
    return NextResponse.json({ error: "ダウンロード回数の上限に達しました" }, { status: 429 });
  }

  const original = purchase.photo.assets[0];
  if (!original) {
    return NextResponse.json({ error: "原本が見つかりません" }, { status: 404 });
  }

  const url = await presignDownload({
    bucket: original.bucket as "alibi-private",
    key: original.s3Key,
    filename: `${purchase.photo.slug}.jpg`,
    expiresSec: 300,
  });

  await prisma.photoPurchase.update({
    where: { id: purchase.id },
    data: { downloadCount: { increment: 1 } },
  });

  await writeAudit({
    userId: session.user.id,
    action: "PHOTO_DOWNLOADED",
    target: purchase.id,
  });

  return NextResponse.json({ url });
}
