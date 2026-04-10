import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { presignDownload, type Bucket } from "@/lib/storage";

// GET: single generation detail + download URL if completed
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const gen = await prisma.generation.findUnique({
    where: { id: params.id },
    include: { template: { select: { title: true } } },
  });
  if (!gen || gen.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let downloadUrl: string | null = null;
  if (gen.status === "COMPLETED" && gen.resultS3Key && gen.resultBucket) {
    downloadUrl = await presignDownload({
      bucket: gen.resultBucket as Bucket,
      key: gen.resultS3Key,
      filename: `alibi-${gen.id}.jpg`,
      expiresSec: 300,
    });
  }

  return NextResponse.json({ ...gen, downloadUrl });
}
