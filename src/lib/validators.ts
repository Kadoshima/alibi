import { z } from "zod";

// Auth
export const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  name: z.string().min(1, "氏名を入力してください").max(80),
  password: z
    .string()
    .min(8, "パスワードは8文字以上")
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

// Face photo upload
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const faceUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.enum(ALLOWED_IMAGE_MIME),
  bytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  label: z.string().max(40).optional(),
});

// Generation request
export const generationSchema = z.object({
  templateId: z.string().cuid(),
  facePhotoId: z.string().cuid(),
});

// Ticket edit
export const ticketEditSchema = z.object({
  uploadKey: z.string().min(1),
  bucket: z.string().min(1),
  newDate: z.string().min(1).max(40),
  originalMime: z.enum(ALLOWED_IMAGE_MIME),
});

// Credit purchase
export const creditPurchaseSchema = z.object({
  packIndex: z.number().int().min(0).max(2),
  couponCode: z.string().max(40).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
