// Privacy pipeline helpers.
//
// Responsibilities:
// 1. EXIF stripping (位置情報・カメラ機種・撮影日時を完全削除)
// 2. Face detection region supply (client does the draw, server consumes approved rects)
// 3. Blur composition (sharp ベースで指定矩形をぼかす)
// 4. Thumbnail generation
//
// NOTE:
// - MVPではサーバー側で sharp を使う前提。face-api.js 等の推論エンジンは後段で統合。
// - パフォーマンスが必要になったら background job (BullMQ/Inngest) に切り出す。

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
 * EXIF を剥ぎ取る:
 *   sharp(buffer).withMetadata({}) ではなく、明示的に metadata を渡さずに
 *   toBuffer() することで全メタデータを削除。
 *
 * MVP スタブ(sharp が手元にない場合のプレースホルダ)。
 */
export async function stripExif(buffer: Buffer): Promise<Buffer> {
  try {
    // 動的 import: 環境によっては sharp が利用不可(MVPで開発を止めない)
    const sharp = (await import("sharp")).default;
    return await sharp(buffer).rotate().jpeg({ quality: 90 }).toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * 指定矩形にぼかしを適用。クライアントで確認済みの領域のみを処理する。
 * 顔検出自体は `detectFaces` で別途。
 */
export async function applyBlurRegions(
  buffer: Buffer,
  regions: BlurRegion[],
): Promise<Buffer> {
  if (regions.length === 0) return buffer;
  try {
    const sharp = (await import("sharp")).default;
    const base = sharp(buffer);
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return buffer;

    // 各領域をクロップしてぼかし → composite で貼り戻す
    const overlays = await Promise.all(
      regions.map(async (r) => {
        const blurred = await sharp(buffer)
          .extract({
            left: Math.max(0, Math.round(r.x)),
            top: Math.max(0, Math.round(r.y)),
            width: Math.max(1, Math.round(r.w)),
            height: Math.max(1, Math.round(r.h)),
          })
          .blur(20)
          .toBuffer();
        return {
          input: blurred,
          left: Math.round(r.x),
          top: Math.round(r.y),
        };
      }),
    );

    return await sharp(buffer).composite(overlays).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * 顔検出(MVPスタブ: 常に空配列)。
 * 本番では @vladmandic/face-api または AWS Rekognition / Google Vision を使う。
 */
export async function detectFaces(_buffer: Buffer): Promise<BlurRegion[]> {
  return [];
}

/**
 * サムネイル生成(幅400px, WebP)
 */
export async function makeThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer).resize({ width: 400 }).webp({ quality: 80 }).toBuffer();
  } catch {
    return buffer;
  }
}
