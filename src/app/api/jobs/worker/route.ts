import { NextResponse } from "next/server";
import { processNextBatch } from "@/lib/queue";
import { registerAllHandlers } from "@/lib/job-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Worker endpoint for the DB-backed job queue.
 *
 * Auth: Bearer token against env JOBS_WORKER_SECRET.
 * Trigger: Vercel Cron, QStash, GitHub Actions, etc.
 *
 * Example:
 *   curl -X POST https://app.example.com/api/jobs/worker \
 *        -H "Authorization: Bearer $JOBS_WORKER_SECRET"
 */
export async function POST(req: Request) {
  const secret = process.env.JOBS_WORKER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "worker not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  registerAllHandlers();

  const url = new URL(req.url);
  const batchSize = Math.min(50, Number(url.searchParams.get("batch") ?? 5));

  const stats = await processNextBatch(batchSize);
  return NextResponse.json({ ok: true, ...stats });
}

// GET is allowed for quick health check; does not process anything.
export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST with Authorization: Bearer <secret>" });
}
