import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { BookingForm } from "./booking-form";
import { formatJpy } from "@/lib/utils";

export const metadata = { title: "予約する" };

export default async function BookPage({ params }: { params: { slug: string } }) {
  const user = await requireUser();

  if (user.kycStatus !== "APPROVED") {
    return (
      <div className="container max-w-2xl py-12">
        <h1 className="text-2xl font-bold">本人確認が必要です</h1>
        <p className="mt-4 text-muted-foreground">
          サービスをご予約いただくには、本人確認（KYC）の完了が必要です。
          マイページより本人確認手続きをお願いいたします。
        </p>
      </div>
    );
  }

  const service = await prisma.service.findUnique({
    where: { slug: params.slug },
    include: { provider: { select: { name: true } } },
  });
  if (!service || service.status !== "ACTIVE") notFound();

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">予約フォーム</h1>
      <p className="mt-2 text-muted-foreground">
        {service.title} / {formatJpy(service.priceJpy)} / {service.durationMin}分
      </p>
      <div className="mt-8">
        <BookingForm
          serviceId={service.id}
          priceJpy={service.priceJpy}
          providerName={service.provider.name ?? ""}
        />
      </div>
    </div>
  );
}
