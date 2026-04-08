import { PrismaClient, ServiceCategory, ServiceStatus, UserRole, KycStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin-password-change-me", 12);
  const providerPassword = await bcrypt.hash("provider-password", 12);
  const customerPassword = await bcrypt.hash("customer-password", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@alibi.example.com" },
    update: {},
    create: {
      email: "admin@alibi.example.com",
      name: "System Admin",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      kycStatus: KycStatus.APPROVED,
      termsAcceptedAt: new Date(),
    },
  });

  const provider = await prisma.user.upsert({
    where: { email: "provider@alibi.example.com" },
    update: {},
    create: {
      email: "provider@alibi.example.com",
      name: "サンプル提供者",
      passwordHash: providerPassword,
      role: UserRole.PROVIDER,
      kycStatus: KycStatus.APPROVED,
      termsAcceptedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@alibi.example.com" },
    update: {},
    create: {
      email: "customer@alibi.example.com",
      name: "サンプル利用者",
      passwordHash: customerPassword,
      role: UserRole.CUSTOMER,
      kycStatus: KycStatus.APPROVED,
      termsAcceptedAt: new Date(),
    },
  });

  const services = [
    {
      title: "フリーランス向け 在籍確認サポート",
      slug: "freelance-employment-verification",
      description:
        "フリーランスの方が賃貸契約時に必要となる在籍確認について、合法的な範囲で事務代行を行います。虚偽申告を助長するものではなく、実際の業務実態の証明サポートです。",
      category: ServiceCategory.EMPLOYMENT_VERIFICATION,
      priceJpy: 19800,
      durationMin: 60,
      legalNotes:
        "本サービスは虚偽の雇用関係の証明は行いません。実際の業務委託契約や実績を元にした手続きサポートのみ提供します。",
    },
    {
      title: "サプライズ演出のスケジュール調整代行",
      slug: "surprise-schedule-coordination",
      description:
        "誕生日や結婚記念日などのサプライズ企画のために、当日のスケジュール調整・連絡代行を行います。",
      category: ServiceCategory.SURPRISE_PLANNING,
      priceJpy: 9800,
      durationMin: 45,
      legalNotes: "配偶者・交際相手を欺く目的での利用は規約違反となります。",
    },
    {
      title: "冠婚葬祭 代理出席サポート",
      slug: "proxy-attendance",
      description:
        "やむを得ない事情で冠婚葬祭に出席できない場合の代理出席および記録サポートを行います。",
      category: ServiceCategory.PROXY_ATTENDANCE,
      priceJpy: 29800,
      durationMin: 180,
      legalNotes: "主催者への事前連絡・許可を必須条件とします。",
    },
    {
      title: "プライバシー保護コンサルティング",
      slug: "privacy-consultation",
      description:
        "ストーカー被害・DV被害などからのプライバシー保護に関する相談を承ります。必要に応じて専門機関をご紹介します。",
      category: ServiceCategory.PRIVACY_CONSULT,
      priceJpy: 5500,
      durationMin: 60,
      legalNotes: "緊急時は110番・専門窓口への連絡を最優先してください。",
    },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        ...s,
        providerId: provider.id,
        status: ServiceStatus.ACTIVE,
        approvedAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED",
      target: "database",
      metadata: { note: "Initial seed" },
    },
  });

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
