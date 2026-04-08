import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceCreateSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? undefined;

  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category: category as any } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (session.user.role !== "PROVIDER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "提供者アカウントで登録してください" },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = serviceCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力が不正です", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const baseSlug = slugify(parsed.data.title) || `svc-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.service.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
      slug,
      providerId: session.user.id,
      status: "PENDING_REVIEW",
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "SERVICE_SUBMITTED",
    target: service.id,
  });

  return NextResponse.json({ ok: true, id: service.id });
}
