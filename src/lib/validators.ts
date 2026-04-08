import { z } from "zod";

export const registerSchema = z
  .object({
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

export const serviceCreateSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(40).max(4000),
  category: z.enum([
    "EMPLOYMENT_VERIFICATION",
    "SCHEDULE_COVER",
    "PROXY_ATTENDANCE",
    "SURPRISE_PLANNING",
    "PRIVACY_CONSULT",
  ]),
  priceJpy: z.number().int().min(500).max(500000),
  durationMin: z.number().int().min(15).max(600),
  legalNotes: z.string().max(2000).optional(),
});

// 禁止用途のキーワード・チェック（簡易フィルタ）
const PROHIBITED_PURPOSE_KEYWORDS = [
  "浮気",
  "不倫",
  "横領",
  "詐欺",
  "偽造",
  "脱税",
  "犯罪",
];

export const bookingCreateSchema = z
  .object({
    serviceId: z.string().cuid(),
    scheduledFor: z.coerce.date().refine((d) => d.getTime() > Date.now(), {
      message: "予約日時は未来の日時を指定してください",
    }),
    purpose: z
      .string()
      .min(20, "利用目的を20文字以上で記載してください")
      .max(2000),
    purposeConsent: z.literal(true, {
      errorMap: () => ({ message: "合法的利用の確認にチェックが必要です" }),
    }),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const lower = data.purpose.toLowerCase();
    for (const kw of PROHIBITED_PURPOSE_KEYWORDS) {
      if (lower.includes(kw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["purpose"],
          message: `「${kw}」を含む利用目的は受付できません。違法・反社会的利用は禁止です。`,
        });
      }
    }
  });

export const reviewCreateSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const reportCreateSchema = z.object({
  serviceId: z.string().cuid().optional(),
  reason: z.string().min(10).max(2000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
