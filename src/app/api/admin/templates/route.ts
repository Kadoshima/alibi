import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { BUCKETS } from "@/lib/storage";

const schema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  category: z.enum([
    "CINEMA","RESTAURANT","BAR","CAFE","TRAVEL",
    "SPORTS","SHOPPING","OUTDOOR","EVENT","OTHER",
  ]),
  description: z.string().max(500).optional(),
  premium: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const existing = await prisma.template.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "このslugは既に使用されています" }, { status: 409 });
  }

  const tpl = await prisma.template.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      category: parsed.data.category,
      description: parsed.data.description,
      premium: parsed.data.premium,
      s3Key: `templates/${parsed.data.slug}.jpg`,
      thumbS3Key: `templates/thumbs/${parsed.data.slug}.webp`,
      bucket: BUCKETS.PUBLIC,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "TEMPLATE_CREATED",
    target: tpl.id,
  });

  return NextResponse.json({ ok: true, id: tpl.id });
}
