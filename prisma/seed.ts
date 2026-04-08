import { PrismaClient, UserRole, PhotoStatus, LicenseKind, AssetVariant } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPw = await bcrypt.hash("admin-password-change-me", 12);
  const creatorPw = await bcrypt.hash("creator-password", 12);
  const buyerPw = await bcrypt.hash("buyer-password", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@alibi.example.com" },
    update: {},
    create: {
      email: "admin@alibi.example.com",
      name: "Admin",
      passwordHash: adminPw,
      role: UserRole.ADMIN,
      termsAcceptedAt: new Date(),
      referralCode: "ADMIN",
    },
  });

  const creator = await prisma.user.upsert({
    where: { email: "creator@alibi.example.com" },
    update: {},
    create: {
      email: "creator@alibi.example.com",
      name: "Sample Creator",
      passwordHash: creatorPw,
      role: UserRole.CREATOR,
      termsAcceptedAt: new Date(),
      referralCode: "CREATOR1",
    },
  });

  await prisma.user.upsert({
    where: { email: "buyer@alibi.example.com" },
    update: {},
    create: {
      email: "buyer@alibi.example.com",
      name: "Sample Buyer",
      passwordHash: buyerPw,
      role: UserRole.BUYER,
      termsAcceptedAt: new Date(),
      referralCode: "BUYER1",
    },
  });

  // Tags
  const tagData = [
    { name: "風景", slug: "landscape" },
    { name: "都市", slug: "urban" },
    { name: "ポートレート", slug: "portrait" },
    { name: "食べ物", slug: "food" },
    { name: "動物", slug: "animal" },
    { name: "抽象", slug: "abstract" },
  ];
  for (const t of tagData) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t });
  }

  // Demo photos
  const demoPhotos = [
    {
      title: "夕暮れの東京タワー",
      slug: "tokyo-tower-sunset",
      description: "夕焼けに染まる東京タワー。プライバシー処理済み(人物の顔はぼかし済み)。",
      priceJpy: 980,
      tags: ["urban", "landscape"],
    },
    {
      title: "京都の古い街並み",
      slug: "kyoto-old-street",
      description: "石畳の路地と格子戸が並ぶ京都の伝統的な街並み。",
      priceJpy: 1480,
      tags: ["urban", "landscape"],
    },
    {
      title: "早朝の富士山",
      slug: "mt-fuji-dawn",
      description: "澄んだ空気の中に佇む富士山。商用利用OK。",
      priceJpy: 2980,
      tags: ["landscape"],
    },
    {
      title: "和食プレート",
      slug: "washoku-plate",
      description: "色鮮やかな和食のワンプレート。料理系ブログに最適。",
      priceJpy: 780,
      tags: ["food"],
    },
  ];

  for (const p of demoPhotos) {
    const photo = await prisma.photo.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ownerId: creator.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        priceJpy: p.priceJpy,
        status: PhotoStatus.ACTIVE,
        maxLicense: LicenseKind.EXTENDED,
        privacyExifStripped: true,
        privacyProcessedAt: new Date(),
        approvedAt: new Date(),
        width: 1920,
        height: 1280,
        bytes: 800_000,
        mimeType: "image/jpeg",
      },
    });

    // Placeholder asset rows(開発環境ではMinIOに実ファイルは置かず、URL生成時にプレースホルダを返す)
    await prisma.photoAsset.upsert({
      where: { photoId_variant: { photoId: photo.id, variant: AssetVariant.THUMB } },
      update: {},
      create: {
        photoId: photo.id,
        variant: AssetVariant.THUMB,
        bucket: "alibi-public",
        s3Key: `thumbs/${photo.id}.webp`,
        width: 400,
        height: 266,
        bytes: 20_000,
        mimeType: "image/webp",
      },
    });
    await prisma.photoAsset.upsert({
      where: { photoId_variant: { photoId: photo.id, variant: AssetVariant.MASKED } },
      update: {},
      create: {
        photoId: photo.id,
        variant: AssetVariant.MASKED,
        bucket: "alibi-public",
        s3Key: `masked/${photo.id}.jpg`,
        width: 1920,
        height: 1280,
        bytes: 800_000,
        mimeType: "image/jpeg",
      },
    });
    await prisma.photoAsset.upsert({
      where: { photoId_variant: { photoId: photo.id, variant: AssetVariant.ORIGINAL } },
      update: {},
      create: {
        photoId: photo.id,
        variant: AssetVariant.ORIGINAL,
        bucket: "alibi-private",
        s3Key: `originals/${photo.id}.jpg`,
        width: 4000,
        height: 2666,
        bytes: 4_500_000,
        mimeType: "image/jpeg",
      },
    });

    // Tags
    for (const slug of p.tags) {
      const tag = await prisma.tag.findUnique({ where: { slug } });
      if (tag) {
        await prisma.photoTag.upsert({
          where: { photoId_tagId: { photoId: photo.id, tagId: tag.id } },
          update: {},
          create: { photoId: photo.id, tagId: tag.id },
        });
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      target: "database",
      metadata: { note: "Photo marketplace seed" },
    },
  });

  console.log("✅ Seed complete (photo marketplace)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
