import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generationSchema } from "@/lib/validators";
import { spendCredits } from "@/lib/credits";
import { enqueue } from "@/lib/queue";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

// GET: list user's generations
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const generations = await prisma.generation.findMany({
    where: { userId: session.user.id },
    include: { template: { select: { title: true, slug: true, thumbS3Key: true, bucket: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(generations);
}

// POST: request a new generation
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = generationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Validate template exists
  const template = await prisma.template.findUnique({
    where: { id: parsed.data.templateId },
  });
  if (!template || !template.active) {
    return NextResponse.json({ error: "テンプレートが見つかりません" }, { status: 404 });
  }

  // Validate face photo belongs to user
  const face = await prisma.facePhoto.findUnique({
    where: { id: parsed.data.facePhotoId },
  });
  if (!face || face.userId !== session.user.id) {
    return NextResponse.json({ error: "顔写真が見つかりません" }, { status: 404 });
  }

  const creditsNeeded = template.premium ? 2 : 1;

  // Spend credits (atomic)
  const ok = await spendCredits(
    session.user.id,
    creditsNeeded,
    "generation",
  );
  if (!ok) {
    return NextResponse.json(
      { error: `クレジットが不足しています (必要: ${creditsNeeded})` },
      { status: 402 },
    );
  }

  // Create generation record
  const gen = await prisma.generation.create({
    data: {
      userId: session.user.id,
      templateId: template.id,
      facePhotoId: face.id,
      creditsUsed: creditsNeeded,
      status: "QUEUED",
    },
  });

  // Enqueue AI job
  const jobId = await enqueue("run_face_swap", {
    generationId: gen.id,
    templateS3Key: template.s3Key,
    templateBucket: template.bucket,
    faceS3Key: face.s3Key,
    faceBucket: face.bucket,
    userId: session.user.id,
  });

  await writeAudit({
    userId: session.user.id,
    action: "GENERATION_REQUESTED",
    target: gen.id,
    metadata: { templateId: template.id, jobId, creditsUsed: creditsNeeded },
  });

  return NextResponse.json({ id: gen.id, jobId, status: "QUEUED", creditsUsed: creditsNeeded });
}
