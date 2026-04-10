import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { faceUploadSchema } from "@/lib/validators";
import { BUCKETS, presignUpload, extFromMime } from "@/lib/storage";
import { randomBytes } from "crypto";

// GET: list user's face photos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const photos = await prisma.facePhoto.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(photos);
}

// POST: initiate face photo upload (returns presigned URL + saves record)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = faceUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Max 5 face photos per user
  const count = await prisma.facePhoto.count({ where: { userId: session.user.id } });
  if (count >= 5) {
    return NextResponse.json({ error: "顔写真は最大5枚まで登録できます" }, { status: 400 });
  }

  const id = randomBytes(12).toString("hex");
  const ext = extFromMime(parsed.data.mimeType);
  const key = `faces/${session.user.id}/${id}.${ext}`;

  const presigned = await presignUpload({
    bucket: BUCKETS.PRIVATE,
    key,
    contentType: parsed.data.mimeType,
  });

  const facePhoto = await prisma.facePhoto.create({
    data: {
      userId: session.user.id,
      s3Key: key,
      bucket: BUCKETS.PRIVATE,
      width: 0, // Updated after upload complete
      height: 0,
      bytes: parsed.data.bytes,
      mimeType: parsed.data.mimeType,
      label: parsed.data.label,
    },
  });

  return NextResponse.json({
    id: facePhoto.id,
    uploadUrl: presigned.url,
    uploadMethod: presigned.method,
    uploadHeaders: presigned.headers,
  });
}
