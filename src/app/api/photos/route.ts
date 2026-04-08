import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { photoCreateSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { BUCKETS, keys, extFromMime } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

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

  // ロール昇格: 初回アップロードで BUYER → CREATOR
  if (session.user.role === "BUYER") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "CREATOR" },
    });
    await writeAudit({
      userId: session.user.id,
      action: "ROLE_UPGRADED_TO_CREATOR",
    });
  }

  // slug 重複回避
  const baseSlug = slugify(parsed.data.title) || `photo-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.photo.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const ext = extFromMime(parsed.data.originalMime);

  const photo = await prisma.$transaction(async (tx) => {
    const created = await tx.photo.create({
      data: {
        ownerId: session.user.id,
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        priceJpy: parsed.data.priceJpy,
        maxLicense: parsed.data.maxLicense,
        status: "PENDING_REVIEW",
        width: parsed.data.originalWidth,
        height: parsed.data.originalHeight,
        bytes: parsed.data.originalBytes,
        mimeType: parsed.data.originalMime,
        privacyExifStripped: true, // パイプライン通過想定
        privacyFacesCount: parsed.data.approvedBlurRegions?.length ?? 0,
        privacyProcessedAt: new Date(),
      },
    });

    // Asset rows
    await tx.photoAsset.createMany({
      data: [
        {
          photoId: created.id,
          variant: "ORIGINAL",
          bucket: BUCKETS.PRIVATE,
          s3Key: keys.original(created.id, ext),
          width: parsed.data.originalWidth,
          height: parsed.data.originalHeight,
          bytes: parsed.data.originalBytes,
          mimeType: parsed.data.originalMime,
        },
        {
          photoId: created.id,
          variant: "MASKED",
          bucket: BUCKETS.PUBLIC,
          s3Key: keys.masked(created.id, ext),
          width: parsed.data.originalWidth,
          height: parsed.data.originalHeight,
          bytes: parsed.data.originalBytes,
          mimeType: parsed.data.originalMime,
        },
        {
          photoId: created.id,
          variant: "THUMB",
          bucket: BUCKETS.PUBLIC,
          s3Key: keys.thumb(created.id),
          width: 400,
          height: Math.floor((parsed.data.originalHeight / parsed.data.originalWidth) * 400),
          bytes: 0,
          mimeType: "image/webp",
        },
      ],
    });

    // Tags (upsert + link)
    for (const slug of parsed.data.tagSlugs ?? []) {
      const tag = await tx.tag.upsert({
        where: { slug },
        update: {},
        create: { slug, name: slug },
      });
      await tx.photoTag.create({
        data: { photoId: created.id, tagId: tag.id },
      });
    }

    return created;
  });

  await prisma.analyticsEvent
    .create({
      data: {
        userId: session.user.id,
        event: "photo_uploaded",
        props: { photoId: photo.id, priceJpy: photo.priceJpy },
      },
    })
    .catch(() => null);

  await writeAudit({
    userId: session.user.id,
    action: "PHOTO_SUBMITTED",
    target: photo.id,
  });

  return NextResponse.json({ ok: true, id: photo.id, slug: photo.slug });
}
