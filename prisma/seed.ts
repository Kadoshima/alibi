import { PrismaClient, UserRole, TemplateCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPw = await bcrypt.hash("admin-password-change-me", 12);
  const userPw = await bcrypt.hash("user-password", 12);

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

  const user = await prisma.user.upsert({
    where: { email: "user@alibi.example.com" },
    update: {},
    create: {
      email: "user@alibi.example.com",
      name: "Demo User",
      passwordHash: userPw,
      role: UserRole.USER,
      termsAcceptedAt: new Date(),
      referralCode: "USER1",
    },
  });

  // Give demo user some credits
  await prisma.creditBalance.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, credits: 10 },
  });

  // Demo templates
  const templates = [
    { title: "映画館の座席", slug: "cinema-seat", category: TemplateCategory.CINEMA, description: "映画館の座席に座っている人物の写真" },
    { title: "レストランのテーブル", slug: "restaurant-table", category: TemplateCategory.RESTAURANT, description: "おしゃれなレストランで食事中の人物" },
    { title: "居酒屋カウンター", slug: "izakaya-counter", category: TemplateCategory.BAR, description: "居酒屋のカウンターで乾杯している人物" },
    { title: "カフェでラテアート", slug: "cafe-latte", category: TemplateCategory.CAFE, description: "カフェでラテを楽しんでいる人物" },
    { title: "空港の出発ロビー", slug: "airport-lobby", category: TemplateCategory.TRAVEL, description: "空港の出発ロビーでスーツケースと一緒に立つ人物" },
    { title: "野球場スタンド", slug: "baseball-stadium", category: TemplateCategory.SPORTS, description: "野球場のスタンドで応援している人物" },
    { title: "ショッピングモール入口", slug: "shopping-mall", category: TemplateCategory.SHOPPING, description: "大型モールの入口で買い物袋を持つ人物" },
    { title: "海辺のサンセット", slug: "beach-sunset", category: TemplateCategory.OUTDOOR, description: "夕暮れの海岸で佇む人物" },
    { title: "コンサート会場", slug: "concert-venue", category: TemplateCategory.EVENT, premium: true, description: "ライブ会場で盛り上がっている人物" },
    { title: "温泉旅館のロビー", slug: "onsen-ryokan", category: TemplateCategory.TRAVEL, premium: true, description: "温泉旅館のロビーで浴衣姿の人物" },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        title: t.title,
        slug: t.slug,
        description: t.description,
        category: t.category,
        s3Key: `templates/${t.slug}.jpg`,
        thumbS3Key: `templates/thumbs/${t.slug}.webp`,
        bucket: "alibi-public",
        premium: t.premium ?? false,
        sortOrder: templates.indexOf(t),
      },
    });
  }

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "SEED", target: "database", metadata: { note: "Alibi maker seed" } },
  });

  console.log("✅ Seed complete (alibi maker)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
