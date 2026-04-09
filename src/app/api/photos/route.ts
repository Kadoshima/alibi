import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { photoCreateSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { processPhoto } from "@/lib/processing";
import { enqueue } from "@/lib/queue";

export const runtime = "nodejs"; // sharp requires node runtime

// ---------------------------------------------------------------------------
// GET /api/photos — list active photos (public)
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const tag = url.searchParams.get("tag");
  const take = Math.min(100, Number(url.searchParams.get("take") ?? 30));

  const photos = await prisma.photo.findMany({
    where: {
      status: "ACTIVE",
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    },
    include: {
      owner: { select: { name: true } },
      assets: { where: { variant: "THUMB" } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json(photos);
}

// ---------------------------------------------------------------------------
// POST /api/photos — upload finalization & processing dispatch
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = photoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }

  // Role upgrade: BUYER → CREATOR on first upload
  if (session.user.role === "BUYER") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "CREATOR" },
    });
    await writeAudit({ userId: session.user.id, action: "ROLE_UPGRADED_TO_CREATOR" });
  }

  // slug uniqueness
  const baseSlug = slugify(parsed.data.title) || `photo-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.photo.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  // 1. Create Photo row (always starts as PROCESSING)
  const photo = await prisma.photo.create({
    data: {
      ownerId: session.user.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      priceJpy: parsed.data.priceJpy,
      maxLicense: parsed.data.maxLicense,
      status: "PROCESSING",
      width: parsed.data.originalWidth,
      height: parsed.data.originalHeight,
      bytes: parsed.data.originalBytes,
      mimeType: parsed.data.originalMime,
    },
  });

  // 2. Tag links
  for (const tagSlug of parsed.data.tagSlugs ?? []) {
    const tag = await prisma.tag.upsert({
      where: { slug: tagSlug },
      update: {},
      create: { slug: tagSlug, name: tagSlug },
    });
    await prisma.photoTag.create({ data: { photoId: photo.id, tagId: tag.id } });
  }

  // 3. Dispatch: async (enqueue job) or sync (run inline)
  const asyncMode = process.env.ASYNC_PROCESSING === "true";

  if (asyncMode) {
    const jobId = await enqueue("process_photo", {
      photoId: photo.id,
      uploadKey: parsed.data.uploadKey,
      mimeType: parsed.data.originalMime,
      blurRegions: parsed.data.approvedBlurRegions,
      autoDetectFaces: true,
      userId: session.user.id,
    });
    await writeAudit({
      userId: session.user.id,
      action: "PHOTO_SUBMITTED_ASYNC",
      target: photo.id,
      metadata: { jobId },
    });
    return NextResponse.json({
      ok: true,
      id: photo.id,
      slug: photo.slug,
      jobId,
      async: true,
    });
  }

  // Sync path
  let result;
  try {
    result = await processPhoto({
      photoId: photo.id,
      uploadKey: parsed.data.uploadKey,
      mimeType: parsed.data.originalMime,
      blurRegions: parsed.data.approvedBlurRegions,
      autoDetectFaces: true,
    });
  } catch (e) {
    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        status: "DRAFT",
        rejectedReason: `processing_error: ${e instanceof Error ? e.message : String(e)}`,
      },
    });
    return NextResponse.json(
      { error: "画像処理に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }

  await prisma.photoAsset.createMany({
    data: [
      {
        photoId: photo.id,
        variant: "ORIGINAL",
        bucket: result.original.bucket,
        s3Key: result.original.key,
        width: result.original.width,
        height: result.original.height,
        bytes: result.original.bytes,
        mimeType: parsed.data.originalMime,
      },
      {
        photoId: photo.id,
        variant: "MASKED",
        bucket: result.masked.bucket,
        s3Key: result.masked.key,
        width: result.masked.width,
        height: result.masked.height,
        bytes: result.masked.bytes,
        mimeType: parsed.data.originalMime,
      },
      {
        photoId: photo.id,
        variant: "THUMB",
        bucket: result.thumb.bucket,
        s3Key: result.thumb.key,
        width: result.thumb.width,
        height: result.thumb.height,
        bytes: result.thumb.bytes,
        mimeType: "image/webp",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      status: "PENDING_REVIEW",
      privacyExifStripped: result.exifStripped,
      privacyFacesCount: result.facesBlurred,
      privacyProcessedAt: new Date(),
    },
  });

  await prisma.analyticsEvent
    .create({
      data: {
        userId: session.user.id,
        event: "photo_uploaded",
        props: {
          photoId: photo.id,
          priceJpy: photo.priceJpy,
          facesBlurred: result.facesBlurred,
          processingErrors: result.errors.length,
        },
      },
    })
    .catch(() => null);

  await writeAudit({
    userId: session.user.id,
    action: "PHOTO_SUBMITTED",
    target: photo.id,
    metadata: {
      facesBlurred: result.facesBlurred,
      exifStripped: result.exifStripped,
    },
  });

  return NextResponse.json({
    ok: true,
    id: photo.id,
    slug: photo.slug,
    async: false,
    processing: {
      exifStripped: result.exifStripped,
      facesBlurred: result.facesBlurred,
      errors: result.errors,
    },
  });
}
