// DB-backed job queue.
//
// Design goals:
//   - Zero extra infrastructure (no Redis), works on any Postgres.
//   - Race-safe claim via transactional UPDATE ... RETURNING of a single row.
//   - Exponential backoff on failure, capped by maxAttempts.
//   - Pluggable handlers registry.
//
// Not designed to scale to millions of jobs/sec. Swap for BullMQ/Inngest if
// that ever becomes a bottleneck.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type JobKind = "process_photo";

export type JobHandler<P = unknown> = (payload: P) => Promise<void>;

const handlers = new Map<JobKind, JobHandler>();

export function registerHandler<P>(kind: JobKind, handler: JobHandler<P>) {
  handlers.set(kind, handler as JobHandler);
}

export async function enqueue(
  kind: JobKind,
  payload: Prisma.InputJsonValue,
  opts?: { runAfter?: Date; maxAttempts?: number },
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      kind,
      payload,
      runAfter: opts?.runAfter ?? new Date(),
      maxAttempts: opts?.maxAttempts ?? 3,
    },
    select: { id: true },
  });
  return job.id;
}

/**
 * Claim a single pending job atomically.
 * Uses a raw `UPDATE ... RETURNING` with `FOR UPDATE SKIP LOCKED` so that
 * concurrent workers never pick up the same job.
 */
export async function claimNext(): Promise<{ id: string; kind: string; payload: unknown } | null> {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; kind: string; payload: unknown }>
  >`
    UPDATE "Job"
       SET "status" = 'RUNNING',
           "claimedAt" = NOW(),
           "attempts" = "attempts" + 1,
           "updatedAt" = NOW()
     WHERE "id" = (
       SELECT "id" FROM "Job"
        WHERE "status" = 'PENDING'
          AND "runAfter" <= NOW()
        ORDER BY "runAfter" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
     )
     RETURNING "id", "kind", "payload"
  `;
  return rows[0] ?? null;
}

export async function complete(id: string) {
  await prisma.job.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function fail(id: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return;

  if (job.attempts >= job.maxAttempts) {
    await prisma.job.update({
      where: { id },
      data: { status: "FAILED", lastError: message },
    });
  } else {
    // Exponential backoff: 30s * 2^attempts
    const backoffSec = 30 * Math.pow(2, job.attempts);
    await prisma.job.update({
      where: { id },
      data: {
        status: "PENDING",
        lastError: message,
        runAfter: new Date(Date.now() + backoffSec * 1000),
      },
    });
  }
}

/**
 * Process up to `batchSize` jobs. Typically invoked from a worker endpoint
 * triggered by cron or external scheduler (Vercel Cron, QStash, etc).
 */
export async function processNextBatch(batchSize: number = 5): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < batchSize; i += 1) {
    const job = await claimNext();
    if (!job) break;
    processed += 1;

    const handler = handlers.get(job.kind as JobKind);
    if (!handler) {
      await fail(job.id, new Error(`No handler registered for kind=${job.kind}`));
      failed += 1;
      continue;
    }

    try {
      await handler(job.payload);
      await complete(job.id);
      succeeded += 1;
    } catch (e) {
      await fail(job.id, e);
      failed += 1;
    }
  }

  return { processed, succeeded, failed };
}
