import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stubDetector, getFaceDetector, detectFaces } from "@/lib/face-detection";

describe("stubDetector", () => {
  it("returns an empty region list", async () => {
    const result = await stubDetector(Buffer.from([]), { width: 100, height: 100 });
    expect(result).toEqual([]);
  });
});

describe("getFaceDetector", () => {
  const original = process.env.FACE_DETECTION_PROVIDER;
  beforeEach(() => delete process.env.FACE_DETECTION_PROVIDER);
  afterEach(() => {
    if (original != null) process.env.FACE_DETECTION_PROVIDER = original;
  });

  it("defaults to the stub provider", () => {
    expect(getFaceDetector()).toBe(stubDetector);
  });

  it("returns stub when provider is unknown", () => {
    process.env.FACE_DETECTION_PROVIDER = "quantum_vision";
    expect(getFaceDetector()).toBe(stubDetector);
  });
});

describe("detectFaces", () => {
  it("never throws — returns [] on failure", async () => {
    // Even with a nonsense buffer, the stub provider returns []
    const res = await detectFaces(Buffer.from([0, 1, 2]), { width: 10, height: 10 });
    expect(Array.isArray(res)).toBe(true);
  });
});
