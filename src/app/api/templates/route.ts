import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: list active templates (public)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? undefined;

  const templates = await prisma.template.findMany({
    where: {
      active: true,
      ...(category ? { category: category as any } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(templates);
}
