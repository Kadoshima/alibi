import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { keys, extFromMime, publicUrl, BUCKETS } from "@/lib/storage";

describe("extFromMime", () => {
  it("maps common mime types", () => {
    expect(extFromMime("image/jpeg")).toBe("jpg");
    expect(extFromMime("image/png")).toBe("png");
    expect(extFromMime("image/webp")).toBe("webp");
    expect(extFromMime("application/octet-stream")).toBe("bin");
  });
});

describe("storage key layout", () => {
  it("builds deterministic keys per variant", () => {
    expect(keys.original("abc", "jpg")).toBe("originals/abc.jpg");
    expect(keys.masked("abc", "jpg")).toBe("masked/abc.jpg");
    expect(keys.thumb("abc")).toBe("thumbs/abc.webp");
    expect(keys.upload("user1", "id1", "png")).toBe("uploads/user1/id1.png");
  });
});

describe("publicUrl", () => {
  const originalBase = process.env.S3_PUBLIC_BASE_URL;
  const originalEndpoint = process.env.S3_ENDPOINT;
  beforeEach(() => {
    delete process.env.S3_PUBLIC_BASE_URL;
    delete process.env.S3_ENDPOINT;
  });
  afterEach(() => {
    if (originalBase != null) process.env.S3_PUBLIC_BASE_URL = originalBase;
    if (originalEndpoint != null) process.env.S3_ENDPOINT = originalEndpoint;
  });

  it("uses S3_PUBLIC_BASE_URL when set", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com";
    expect(publicUrl(BUCKETS.PUBLIC, "thumbs/abc.webp")).toBe(
      "https://cdn.example.com/thumbs/abc.webp",
    );
  });

  it("trims trailing slash on base URL", () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/";
    expect(publicUrl(BUCKETS.PUBLIC, "masked/x.jpg")).toBe(
      "https://cdn.example.com/masked/x.jpg",
    );
  });

  it("falls back to endpoint + bucket path when base URL missing", () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";
    expect(publicUrl(BUCKETS.PUBLIC, "masked/x.jpg")).toBe(
      "http://localhost:9000/alibi-public/masked/x.jpg",
    );
  });
});
