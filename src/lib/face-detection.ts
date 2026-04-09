// Pluggable face detection.
//
// Providers:
//   - stub        : always returns [] (default, zero dependency)
//   - rekognition : AWS Rekognition DetectFaces (requires AWS creds)
//
// Env:
//   FACE_DETECTION_PROVIDER=stub | rekognition
//
// Output: BlurRegion[] in pixel coordinates relative to the input image.
// Adds a small padding around the detected bounding box because Rekognition
// returns a tight crop of the face itself; the caller wants to blur the
// surrounding area too.

import type { BlurRegion } from "@/lib/privacy";

export type FaceDetector = (
  buffer: Buffer,
  meta: { width: number; height: number },
) => Promise<BlurRegion[]>;

const PADDING_RATIO = 0.2;

function padRegion(r: BlurRegion, imgW: number, imgH: number): BlurRegion {
  const padX = r.w * PADDING_RATIO;
  const padY = r.h * PADDING_RATIO;
  const x = Math.max(0, r.x - padX);
  const y = Math.max(0, r.y - padY);
  const w = Math.min(imgW - x, r.w + padX * 2);
  const h = Math.min(imgH - y, r.h + padY * 2);
  return { x, y, w, h };
}

// ----- Stub provider -----
export const stubDetector: FaceDetector = async () => [];

// ----- AWS Rekognition provider -----
export const rekognitionDetector: FaceDetector = async (buffer, meta) => {
  // Dynamic import so the package is only loaded when configured.
  const { RekognitionClient, DetectFacesCommand } = await import(
    "@aws-sdk/client-rekognition"
  );

  const client = new RekognitionClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  const res = await client.send(
    new DetectFacesCommand({
      Image: { Bytes: buffer },
      Attributes: ["DEFAULT"],
    }),
  );

  const faces = res.FaceDetails ?? [];
  return faces
    .map((f) => f.BoundingBox)
    .filter((bb): bb is NonNullable<typeof bb> => !!bb)
    .map((bb) => {
      const x = (bb.Left ?? 0) * meta.width;
      const y = (bb.Top ?? 0) * meta.height;
      const w = (bb.Width ?? 0) * meta.width;
      const h = (bb.Height ?? 0) * meta.height;
      return padRegion({ x, y, w, h }, meta.width, meta.height);
    });
};

// ----- Selector -----
export function getFaceDetector(): FaceDetector {
  const provider = (process.env.FACE_DETECTION_PROVIDER ?? "stub").toLowerCase();
  switch (provider) {
    case "rekognition":
      return rekognitionDetector;
    case "stub":
    default:
      return stubDetector;
  }
}

export async function detectFaces(
  buffer: Buffer,
  meta: { width: number; height: number },
): Promise<BlurRegion[]> {
  try {
    return await getFaceDetector()(buffer, meta);
  } catch (e) {
    console.warn("[face-detection] failed, returning []:", e);
    return [];
  }
}
