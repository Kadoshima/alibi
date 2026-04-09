// Registers all background job handlers.
//
// Import this module once at the entry point of any worker / route that
// needs to dispatch jobs (e.g. /api/jobs/worker). Registration is idempotent.

import { registerHandler } from "@/lib/queue";
import { processPhoto } from "@/lib/processing";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import type { BlurRegion } from "@/lib/privacy";

type ProcessPhotoJobPayload = {
  photoId: string;
  uploadKey: string;
  mimeType: string;
  blurRegions?: BlurRegion[];
  autoDetectFaces?: boolean;
  userId: string;
};

let registered = false;

export function registerAllHandlers() {
  if (registered) return;
  registered = true;

  registerHandler<ProcessPhotoJobPayload>("process_photo", async (payload) => {
    const result = await processPhoto({
      photoId: payload.photoId,
      uploadKey: payload.uploadKey,
      mimeType: payload.mimeType,
      blurRegions: payload.blurRegions,
      autoDetectFaces: payload.autoDetectFaces,
    });

    // Persist PhotoAsset rows
    await prisma.photoAsset.createMany({
      data: [
        {
          photoId: payload.photoId,
          variant: "ORIGINAL",
          bucket: result.original.bucket,
          s3Key: result.original.key,
          width: result.original.width,
          height: result.original.height,
          bytes: result.original.bytes,
          mimeType: payload.mimeType,
        },
        {
          photoId: payload.photoId,
          variant: "MASKED",
          bucket: result.masked.bucket,
          s3Key: result.masked.key,
          width: result.masked.width,
          height: result.masked.height,
          bytes: result.masked.bytes,
          mimeType: payload.mimeType,
        },
        {
          photoId: payload.photoId,
          variant: "THUMB",
          bucket: result.thumb.bucket,
          s3Key: result.thumb.key,
          width: result.thumb.width,
          height: result.thumb.height,
          bytes: result.thumb.bytes,
          mimeType: "image/webp",
        },
      ],
      skipDuplicates: true,
    });

    await prisma.photo.update({
      where: { id: payload.photoId },
      data: {
        status: "PENDING_REVIEW",
        privacyExifStripped: result.exifStripped,
        privacyFacesCount: result.facesBlurred,
        privacyProcessedAt: new Date(),
      },
    });

    await writeAudit({
      userId: payload.userId,
      action: "PHOTO_PROCESSED_ASYNC",
      target: payload.photoId,
      metadata: { facesBlurred: result.facesBlurred, errors: result.errors.length },
    });
  });
}
