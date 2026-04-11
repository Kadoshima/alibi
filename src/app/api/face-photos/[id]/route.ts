import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3";
import { writeAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const face = await prisma.facePhoto.findUnique({ where: { id: params.id } });
  if (!face || face.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // S3 cleanup (best effort)
  await deleteObject({ bucket: face.bucket, key: face.s3Key }).catch(() => null);

  await prisma.facePhoto.delete({ where: { id: params.id } });

  await writeAudit({
    userId: session.user.id,
    action: "FACE_PHOTO_DELETED",
    target: params.id,
  });

  return NextResponse.json({ ok: true });
}
