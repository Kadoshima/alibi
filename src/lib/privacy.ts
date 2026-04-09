// Privacy pipeline helpers (shared primitives).
//
// Responsibilities:
//   - Type definitions (BlurRegion)
//   - Sharp-based EXIF strip / blur compose / thumbnail (used by processing.ts)
//   - Face detection is delegated to lib/face-detection.ts

export type BlurRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PrivacyResult = {
  exifStripped: boolean;
  facesCount: number;
  maskedKey: string;
  thumbKey: string;
  width: number;
  height: number;
  bytes: number;
};

/**
 * EXIF を剥ぎ取る: sharp は明示的に withMetadata を呼ばない限り、
 * 全メタデータを削除する。ここでは toBuffer() を通すだけで十分。
 */
export async function stripExif(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer).rotate().jpeg({ quality: 95 }).toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * 指定矩形にぼかしを適用する。面倒なぼかし合成ロジックは processing.ts 側に集約。
 * ここは単発ユーティリティとして保持。
 */
export async function applyBlurRegions(
  buffer: Buffer,
  regions: BlurRegion[],
): Promise<Buffer> {
  if (regions.length === 0) return buffer;
  try {
    const sharp = (await import("sharp")).default;
    const overlays = await Promise.all(
      regions.map(async (r) => {
        const blurred = await sharp(buffer)
          .extract({
            left: Math.max(0, Math.round(r.x)),
            top: Math.max(0, Math.round(r.y)),
            width: Math.max(1, Math.round(r.w)),
            height: Math.max(1, Math.round(r.h)),
          })
          .blur(22)
          .toBuffer();
        return { input: blurred, left: Math.round(r.x), top: Math.round(r.y) };
      }),
    );
    return await sharp(buffer).composite(overlays).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * サムネ生成 (400px WebP)
 */
export async function makeThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return buffer;
  }
}

// 後方互換: detectFaces は lib/face-detection.ts に統合されている
export { detectFaces } from "@/lib/face-detection";
