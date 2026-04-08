import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadInitSchema } from "@/lib/validators";
import { BUCKETS, keys, extFromMime, presignUpload } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = uploadInitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }

  const id = randomBytes(12).toString("hex");
  const ext = extFromMime(parsed.data.mimeType);
  const key = keys.upload(session.user.id, id, ext);
  const presigned = await presignUpload({
    bucket: BUCKETS.PRIVATE,
    key,
    contentType: parsed.data.mimeType,
  });

  return NextResponse.json({
    url: presigned.url,
    method: presigned.method,
    headers: presigned.headers,
    bucket: BUCKETS.PRIVATE,
    key,
  });
}
