// Replicate API client for face swap / AI image generation.
//
// 使用モデル例:
//   - omniedgeio/face-swap (高品質フェイススワップ)
//   - lucataco/instantid (参照顔からの画像生成)
//
// REPLICATE_API_TOKEN env が必須。
// 開発時はスタブモードで presigned URL を返す。

export type FaceSwapInput = {
  sourceImageUrl: string; // テンプレート画像(人が写ったシーン)
  targetFaceUrl: string;  // ユーザーの顔写真
};

export type FaceSwapResult = {
  ok: boolean;
  outputUrl?: string; // 生成結果の画像 URL
  predictionId?: string;
  error?: string;
};

const REPLICATE_MODEL =
  process.env.REPLICATE_MODEL ?? "omniedgeio/face-swap:c2d783366e8d32e6e82c40682fab6b4c23b9c6eff2692c0571b69c698d9d1c70";

export async function runFaceSwap(input: FaceSwapInput): Promise<FaceSwapResult> {
  const token = process.env.REPLICATE_API_TOKEN;

  // Dev stub: Replicate キーが未設定なら、ソース画像をそのまま返す
  if (!token) {
    console.warn("[ai] REPLICATE_API_TOKEN not set — returning source image as stub");
    return {
      ok: true,
      outputUrl: input.sourceImageUrl,
      predictionId: `stub-${Date.now()}`,
    };
  }

  try {
    // 1. Create prediction
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait", // synchronous wait (up to 60s)
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL.includes(":") ? REPLICATE_MODEL.split(":")[1] : undefined,
        model: REPLICATE_MODEL.includes(":") ? undefined : REPLICATE_MODEL,
        input: {
          source_image: input.sourceImageUrl,
          target_image: input.targetFaceUrl,
        },
      }),
    });

    const prediction = await createRes.json();

    if (prediction.status === "succeeded" && prediction.output) {
      const outputUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
      return {
        ok: true,
        outputUrl,
        predictionId: prediction.id,
      };
    }

    if (prediction.status === "failed") {
      return {
        ok: false,
        predictionId: prediction.id,
        error: prediction.error ?? "prediction failed",
      };
    }

    // 2. If not completed yet (Prefer: wait timed out), poll
    if (prediction.id && prediction.status === "processing") {
      return await pollPrediction(prediction.id, token);
    }

    return {
      ok: false,
      predictionId: prediction.id,
      error: `unexpected status: ${prediction.status}`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function pollPrediction(id: string, token: string): Promise<FaceSwapResult> {
  const maxWait = 120_000;
  const interval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pred = await res.json();

    if (pred.status === "succeeded" && pred.output) {
      const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
      return { ok: true, outputUrl, predictionId: id };
    }
    if (pred.status === "failed" || pred.status === "canceled") {
      return { ok: false, predictionId: id, error: pred.error ?? pred.status };
    }
  }
  return { ok: false, predictionId: id, error: "timeout" };
}

/**
 * S3 のオブジェクトから一時的な公開 URL を生成する (Replicate に渡すため)。
 * lib/storage.ts の presignDownload を使う。
 */
export { presignDownload as getPublicUrlForAI } from "@/lib/storage";
