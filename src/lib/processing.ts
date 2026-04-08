// Server-side image processing pipeline.
//
// Responsibilities:
//   1. Fetch raw upload from PRIVATE S3 bucket (uploads/ prefix)
//   2. Strip EXIF & auto-rotate
//   3. Apply user-approved blur regions
//   4. Write ORIGINAL (privacy-stripped, full res) to PRIVATE bucket (originals/)
//   5. Generate MASKED variant (public preview, with watermark) → PUBLIC bucket
//   6. Generate THUMB variant (WebP 400px) → PUBLIC bucket
//   7. Delete the temporary upload object
//
// Design notes:
// - Designed to be safe to re-run (idempotent by `photoId`).
// - `sharp` is dynamically imported so tests / environments without native binary
//   can still load this module.
// - Failures per-step are caught and surfaced in the return object so the caller
//   can persist a partial state (e.g. PENDING_REVIEW with an error note).

import { BUCKETS, keys, extFromMime, type Bucket } from "@/lib/storage";
import { getObjectBuffer, putObject, deleteObject } from "@/lib/s3";
import type { BlurRegion } from "@/lib/privacy";

export type ProcessInput = {
  photoId: string;
  uploadKey: string; // uploads/{userId}/{id}.{ext}
  mimeType: string;
  blurRegions?: BlurRegion[];
  watermarkText?: string;
};

export type ProcessResult = {
  ok: boolean;
  photoId: string;
  original: { bucket: Bucket; key: string; bytes: number; width: number; height: number };
  masked: { bucket: Bucket; key: string; bytes: number; width: number; height: number };
  thumb: { bucket: Bucket; key: string; bytes: number; width: number; height: number };
  exifStripped: boolean;
  facesBlurred: number;
  errors: string[];
};

export async function processPhoto(input: ProcessInput): Promise<ProcessResult> {
  const errors: string[] = [];
  const ext = extFromMime(input.mimeType);
  const originalKey = keys.original(input.photoId, ext);
  const maskedKey = keys.masked(input.photoId, ext);
  const thumbKey = keys.thumb(input.photoId);

  // 1. Pull raw upload from temp location.
  const raw = await getObjectBuffer({
    bucket: BUCKETS.PRIVATE,
    key: input.uploadKey,
  });

  // 2. EXIF strip + auto-rotate (ORIGINAL quality)
  let stripped: Buffer;
  let originalMeta = { width: 0, height: 0 };
  try {
    const sharp = (await import("sharp")).default;
    const pipeline = sharp(raw).rotate();
    const meta = await pipeline.metadata();
    originalMeta = { width: meta.width ?? 0, height: meta.height ?? 0 };
    stripped = await pipeline.jpeg({ quality: 95 }).toBuffer();
  } catch (e) {
    errors.push(`exif_strip_failed:${errText(e)}`);
    stripped = raw;
  }

  // 3. Apply blur regions → MASKED (with optional watermark)
  let masked: Buffer = stripped;
  let facesBlurred = 0;
  try {
    const regions = input.blurRegions ?? [];
    if (regions.length > 0) {
      const sharp = (await import("sharp")).default;
      const overlays = await Promise.all(
        regions.map(async (r) => {
          const blob = await sharp(stripped)
            .extract({
              left: Math.max(0, Math.round(r.x)),
              top: Math.max(0, Math.round(r.y)),
              width: Math.max(1, Math.round(r.w)),
              height: Math.max(1, Math.round(r.h)),
            })
            .blur(22)
            .toBuffer();
          return { input: blob, left: Math.round(r.x), top: Math.round(r.y) };
        }),
      );
      masked = await sharp(stripped)
        .composite(overlays)
        .jpeg({ quality: 85 })
        .toBuffer();
      facesBlurred = regions.length;
    } else {
      // Still re-encode at slightly lower quality for the public preview.
      const sharp = (await import("sharp")).default;
      masked = await sharp(stripped).jpeg({ quality: 85 }).toBuffer();
    }

    // Optional watermark overlay
    if (input.watermarkText) {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(masked).metadata();
      const fontSize = Math.max(18, Math.floor((meta.width ?? 1000) / 30));
      const svg = Buffer.from(
        `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
           <text x="${(meta.width ?? 0) - 20}" y="${(meta.height ?? 0) - 20}"
                 text-anchor="end" font-family="sans-serif" font-size="${fontSize}"
                 fill="white" fill-opacity="0.6" stroke="black" stroke-opacity="0.5" stroke-width="1">
             ${escapeSvg(input.watermarkText)}
           </text>
         </svg>`,
      );
      masked = await sharp(masked)
        .composite([{ input: svg, top: 0, left: 0 }])
        .jpeg({ quality: 85 })
        .toBuffer();
    }
  } catch (e) {
    errors.push(`mask_compose_failed:${errText(e)}`);
  }

  // 4. Thumbnail
  let thumb: Buffer = Buffer.alloc(0);
  let thumbMeta = { width: 0, height: 0 };
  try {
    const sharp = (await import("sharp")).default;
    const pipeline = sharp(masked).resize({ width: 400, withoutEnlargement: true });
    thumb = await pipeline.webp({ quality: 80 }).toBuffer();
    const meta = await sharp(thumb).metadata();
    thumbMeta = { width: meta.width ?? 400, height: meta.height ?? 0 };
  } catch (e) {
    errors.push(`thumb_failed:${errText(e)}`);
  }

  // 5. Upload all three variants
  const uploads: Array<Promise<unknown>> = [];
  uploads.push(
    putObject({
      bucket: BUCKETS.PRIVATE,
      key: originalKey,
      body: stripped,
      contentType: input.mimeType,
    }).catch((e) => errors.push(`original_upload_failed:${errText(e)}`)),
  );
  uploads.push(
    putObject({
      bucket: BUCKETS.PUBLIC,
      key: maskedKey,
      body: masked,
      contentType: input.mimeType,
    }).catch((e) => errors.push(`masked_upload_failed:${errText(e)}`)),
  );
  if (thumb.length > 0) {
    uploads.push(
      putObject({
        bucket: BUCKETS.PUBLIC,
        key: thumbKey,
        body: thumb,
        contentType: "image/webp",
      }).catch((e) => errors.push(`thumb_upload_failed:${errText(e)}`)),
    );
  }
  await Promise.all(uploads);

  // 6. Clean up the temporary upload (best effort)
  await deleteObject({ bucket: BUCKETS.PRIVATE, key: input.uploadKey }).catch((e) =>
    errors.push(`cleanup_failed:${errText(e)}`),
  );

  return {
    ok: errors.length === 0,
    photoId: input.photoId,
    original: {
      bucket: BUCKETS.PRIVATE,
      key: originalKey,
      bytes: stripped.length,
      width: originalMeta.width,
      height: originalMeta.height,
    },
    masked: {
      bucket: BUCKETS.PUBLIC,
      key: maskedKey,
      bytes: masked.length,
      width: originalMeta.width,
      height: originalMeta.height,
    },
    thumb: {
      bucket: BUCKETS.PUBLIC,
      key: thumbKey,
      bytes: thumb.length,
      width: thumbMeta.width,
      height: thumbMeta.height,
    },
    exifStripped: errors.every((e) => !e.startsWith("exif_strip_failed")),
    facesBlurred,
    errors,
  };
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function escapeSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
