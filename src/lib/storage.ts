// Storage abstraction for S3-compatible backends.
//
// 役割:
// - バケット名の集中管理
// - S3 オブジェクトキーの命名規則を一箇所に集約
// - 公開 URL の解決 (CDN / MinIO)
// - Presigned URL の発行 (lib/s3.ts の薄いラッパー)

import { presignPut, presignGet } from "@/lib/s3";

export const BUCKETS = {
  PUBLIC: process.env.S3_PUBLIC_BUCKET ?? "alibi-public",
  PRIVATE: process.env.S3_PRIVATE_BUCKET ?? "alibi-private",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

// ------------------------------------------------------------------
// Object key layout
// ------------------------------------------------------------------
export const keys = {
  original: (photoId: string, ext: string) => `originals/${photoId}.${ext}`,
  masked: (photoId: string, ext: string) => `masked/${photoId}.${ext}`,
  thumb: (photoId: string) => `thumbs/${photoId}.webp`,
  upload: (userId: string, id: string, ext: string) => `uploads/${userId}/${id}.${ext}`,
};

// ------------------------------------------------------------------
// Public URL resolver (MASKED/THUMB)
// ------------------------------------------------------------------
export function publicUrl(bucket: Bucket, key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  return `${endpoint}/${bucket}/${key}`;
}

// ------------------------------------------------------------------
// Presigned URLs
// ------------------------------------------------------------------
export async function presignUpload(opts: {
  bucket: Bucket;
  key: string;
  contentType: string;
  expiresSec?: number;
}): Promise<{ url: string; method: "PUT"; headers: Record<string, string> }> {
  const url = await presignPut({
    bucket: opts.bucket,
    key: opts.key,
    contentType: opts.contentType,
    expiresIn: opts.expiresSec ?? 300,
  });
  return {
    url,
    method: "PUT",
    headers: { "Content-Type": opts.contentType },
  };
}

export async function presignDownload(opts: {
  bucket: Bucket;
  key: string;
  expiresSec?: number;
  filename?: string;
}): Promise<string> {
  return presignGet({
    bucket: opts.bucket,
    key: opts.key,
    expiresIn: opts.expiresSec ?? 300,
    responseContentDisposition: opts.filename
      ? `attachment; filename="${opts.filename}"`
      : undefined,
  });
}

// ------------------------------------------------------------------
// MIME helpers
// ------------------------------------------------------------------
export function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}
