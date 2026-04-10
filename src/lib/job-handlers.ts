// Background job handlers.
//
// Registers: run_face_swap (AI generation processing)

import { registerHandler } from "@/lib/queue";
import { runFaceSwap } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { presignDownload, BUCKETS } from "@/lib/storage";
import { getObjectBuffer, putObject } from "@/lib/s3";
import { writeAudit } from "@/lib/audit";

type FaceSwapJobPayload = {
  generationId: string;
  templateS3Key: string;
  templateBucket: string;
  faceS3Key: string;
  faceBucket: string;
  userId: string;
};

let registered = false;

export function registerAllHandlers() {
  if (registered) return;
  registered = true;

  registerHandler<FaceSwapJobPayload>("run_face_swap", async (payload) => {
    await prisma.generation.update({
      where: { id: payload.generationId },
      data: { status: "PROCESSING" },
    });

    // Get presigned URLs for Replicate (needs public URLs)
    const sourceUrl = await presignDownload({
      bucket: payload.templateBucket as typeof BUCKETS.PUBLIC,
      key: payload.templateS3Key,
      expiresSec: 600,
    });
    const targetUrl = await presignDownload({
      bucket: payload.faceBucket as typeof BUCKETS.PRIVATE,
      key: payload.faceS3Key,
      expiresSec: 600,
    });

    const result = await runFaceSwap({
      sourceImageUrl: sourceUrl,
      targetFaceUrl: targetUrl,
    });

    if (!result.ok || !result.outputUrl) {
      await prisma.generation.update({
        where: { id: payload.generationId },
        data: { status: "FAILED", error: result.error ?? "unknown" },
      });
      throw new Error(result.error ?? "face swap failed");
    }

    // Download the result and store in S3
    const resultKey = `generations/${payload.generationId}.jpg`;
    try {
      const imageRes = await fetch(result.outputUrl);
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      await putObject({
        bucket: BUCKETS.PRIVATE,
        key: resultKey,
        body: imageBuffer,
        contentType: "image/jpeg",
      });
    } catch (e) {
      await prisma.generation.update({
        where: { id: payload.generationId },
        data: { status: "FAILED", error: `store_failed: ${e}` },
      });
      throw e;
    }

    await prisma.generation.update({
      where: { id: payload.generationId },
      data: {
        status: "COMPLETED",
        resultS3Key: resultKey,
        resultBucket: BUCKETS.PRIVATE,
        replicatePredId: result.predictionId,
        completedAt: new Date(),
      },
    });

    await writeAudit({
      userId: payload.userId,
      action: "GENERATION_COMPLETED",
      target: payload.generationId,
    });
  });
}
