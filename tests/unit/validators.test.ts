import { describe, it, expect } from "vitest";
import {
  registerSchema,
  photoCreateSchema,
  purchaseCreateSchema,
  uploadInitSchema,
} from "@/lib/validators";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      name: "山田太郎",
      password: "password123",
      termsAccepted: true,
    });
    expect(res.success).toBe(true);
  });

  it("rejects weak password", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      name: "山田",
      password: "short",
      termsAccepted: true,
    });
    expect(res.success).toBe(false);
  });

  it("requires terms acceptance", () => {
    const res = registerSchema.safeParse({
      email: "test@example.com",
      name: "山田",
      password: "password123",
      termsAccepted: false,
    });
    expect(res.success).toBe(false);
  });
});

describe("uploadInitSchema", () => {
  it("accepts a valid JPEG upload", () => {
    expect(
      uploadInitSchema.safeParse({
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        bytes: 1_200_000,
      }).success,
    ).toBe(true);
  });

  it("rejects oversized files", () => {
    expect(
      uploadInitSchema.safeParse({
        filename: "big.jpg",
        mimeType: "image/jpeg",
        bytes: 100 * 1024 * 1024,
      }).success,
    ).toBe(false);
  });

  it("rejects disallowed mime types", () => {
    expect(
      uploadInitSchema.safeParse({
        filename: "shady.exe",
        mimeType: "application/octet-stream",
        bytes: 100,
      }).success,
    ).toBe(false);
  });
});

describe("photoCreateSchema", () => {
  const valid = {
    title: "夕日の富士山",
    description: "とても美しい夕日の写真",
    priceJpy: 980,
    maxLicense: "COMMERCIAL" as const,
    tagSlugs: ["landscape"],
    uploadKey: "uploads/abc/xyz.jpg",
    originalWidth: 4000,
    originalHeight: 2666,
    originalBytes: 4_000_000,
    originalMime: "image/jpeg" as const,
  };

  it("accepts a well-formed payload", () => {
    expect(photoCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects too-low price", () => {
    expect(photoCreateSchema.safeParse({ ...valid, priceJpy: 10 }).success).toBe(false);
  });

  it("rejects invalid mime type", () => {
    expect(
      photoCreateSchema.safeParse({ ...valid, originalMime: "application/pdf" }).success,
    ).toBe(false);
  });
});

describe("purchaseCreateSchema", () => {
  it("accepts valid purchase request", () => {
    expect(
      purchaseCreateSchema.safeParse({
        photoId: "clx2pd1aj0000008l6hwm9wcg",
        licenseKind: "PERSONAL",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown license kind", () => {
    expect(
      purchaseCreateSchema.safeParse({
        photoId: "clx2pd1aj0000008l6hwm9wcg",
        licenseKind: "GODMODE",
      }).success,
    ).toBe(false);
  });
});
