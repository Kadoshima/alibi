import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  name: z.string().min(1, "氏名を入力してください").max(80),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で設定してください")
    .regex(/[A-Za-z]/, "英字を含めてください")
    .regex(/[0-9]/, "数字を含めてください"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "利用規約への同意が必要です" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Photo upload & metadata
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const uploadInitSchema = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.enum(ALLOWED_IMAGE_MIME),
  bytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
});

export const photoCreateSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(4000).optional(),
  priceJpy: z.number().int().min(100).max(500_000),
  maxLicense: z.enum(["PERSONAL", "COMMERCIAL", "EXTENDED"]),
  tagSlugs: z.array(z.string().min(1).max(40)).max(10).optional(),
  uploadKey: z.string().min(1), // S3 key returned by uploadInit
  originalWidth: z.number().int().min(1),
  originalHeight: z.number().int().min(1),
  originalBytes: z.number().int().min(1),
  originalMime: z.enum(ALLOWED_IMAGE_MIME),
  // Face regions (from detection) that the user approved for blurring
  approvedBlurRegions: z
    .array(
      z.object({
        x: z.number().min(0),
        y: z.number().min(0),
        w: z.number().min(1),
        h: z.number().min(1),
      }),
    )
    .max(100)
    .optional(),
});

export const photoUpdateSchema = photoCreateSchema
  .partial()
  .extend({ id: z.string().cuid() });

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export const purchaseCreateSchema = z.object({
  photoId: z.string().cuid(),
  licenseKind: z.enum(["PERSONAL", "COMMERCIAL", "EXTENDED"]),
  couponCode: z.string().max(40).optional(),
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviewCreateSchema = z.object({
  photoId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UploadInitInput = z.infer<typeof uploadInitSchema>;
export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
export type PurchaseCreateInput = z.infer<typeof purchaseCreateSchema>;
