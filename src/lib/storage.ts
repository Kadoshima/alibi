// Storage abstraction for S3-compatible backends.
//
// MVPではPresigned URLの発行・オブジェクトキーの組み立て・公開URLの解決を担当する。
// 本番では AWS SDK v3 もしくは Cloudflare R2 SDK を直接呼び出す。
// 開発環境ではMinIO(docker-compose)を想定。

export const BUCKETS = {
  PUBLIC: process.env.S3_PUBLIC_BUCKET ?? "alibi-public",
  PRIVATE: process.env.S3_PRIVATE_BUCKET ?? "alibi-private",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

// Object key layout
export const keys = {
  original: (photoId: string, ext: string) => `originals/${photoId}.${ext}`,
  masked: (photoId: string, ext: string) => `masked/${photoId}.${ext}`,
  thumb: (photoId: string) => `thumbs/${photoId}.webp`,
  upload: (userId: string, id: string, ext: string) => `uploads/${userId}/${id}.${ext}`,
};

// Public CDN URL resolver (MASKED/THUMB).
// 本番では CloudFront / R2 public域URL を環境変数から差し込む。
export function publicUrl(bucket: Bucket, key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  // Fallback: MinIO dev
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  return `${endpoint}/${bucket}/${key}`;
}

// Presigned PUT URL — client が直接S3 にアップロードするためのURL。
// ここでは MVP スタブ。本番は @aws-sdk/s3-request-presigner 等を使う。
export async function presignUpload(opts: {
  bucket: Bucket;
  key: string;
  contentType: string;
  expiresSec?: number;
}): Promise<{ url: string; method: "PUT"; headers: Record<string, string> }> {
  const expiresSec = opts.expiresSec ?? 300;
  // TODO: swap for real AWS SDK v3 getSignedUrl once credentials wired up.
  const url =
    `${process.env.S3_ENDPOINT ?? "http://localhost:9000"}/${opts.bucket}/${opts.key}` +
    `?X-Amz-Expires=${expiresSec}`;
  return {
    url,
    method: "PUT",
    headers: { "Content-Type": opts.contentType },
  };
}

// Presigned GET URL — 購入者向けダウンロード用。
export async function presignDownload(opts: {
  bucket: Bucket;
  key: string;
  expiresSec?: number;
  filename?: string;
}): Promise<string> {
  const expiresSec = opts.expiresSec ?? 300;
  // TODO: real presigned URL with Content-Disposition: attachment; filename=...
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  const disposition = opts.filename
    ? `&response-content-disposition=attachment%3B%20filename%3D${encodeURIComponent(opts.filename)}`
    : "";
  return `${endpoint}/${opts.bucket}/${opts.key}?X-Amz-Expires=${expiresSec}${disposition}`;
}

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
