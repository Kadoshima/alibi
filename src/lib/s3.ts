// Thin AWS SDK v3 wrapper.
//
// 開発環境は MinIO (docker-compose) を、本番は AWS S3 / Cloudflare R2 を想定。
// `forcePathStyle: true` により MinIO でも R2 でも同じコードパスで動く。

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cached: S3Client | null = null;

export function getS3(): S3Client {
  if (cached) return cached;
  cached = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true, // MinIO/R2互換
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
    },
  });
  return cached;
}

export async function presignPut(opts: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  return getSignedUrl(getS3(), cmd, { expiresIn: opts.expiresIn ?? 300 });
}

export async function presignGet(opts: {
  bucket: string;
  key: string;
  expiresIn?: number;
  responseContentDisposition?: string;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: opts.bucket,
    Key: opts.key,
    ResponseContentDisposition: opts.responseContentDisposition,
  });
  return getSignedUrl(getS3(), cmd, { expiresIn: opts.expiresIn ?? 300 });
}

export async function putObject(opts: {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: opts.bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
}

export async function getObjectBuffer(opts: {
  bucket: string;
  key: string;
}): Promise<Buffer> {
  const res = await getS3().send(
    new GetObjectCommand({ Bucket: opts.bucket, Key: opts.key }),
  );
  const stream = res.Body as NodeJS.ReadableStream | null;
  if (!stream) throw new Error(`Empty body for ${opts.bucket}/${opts.key}`);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

export async function deleteObject(opts: { bucket: string; key: string }): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: opts.bucket, Key: opts.key }));
}

export async function headObject(opts: { bucket: string; key: string }): Promise<{
  exists: boolean;
  size?: number;
  contentType?: string;
}> {
  try {
    const res = await getS3().send(
      new HeadObjectCommand({ Bucket: opts.bucket, Key: opts.key }),
    );
    return {
      exists: true,
      size: res.ContentLength,
      contentType: res.ContentType,
    };
  } catch {
    return { exists: false };
  }
}
