import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter keyed by IP.
// NOTE: For production, swap for Upstash/Redis.
const WINDOW_MS = 60_000;
const MAX_REQ = 120;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  if (entry.count > MAX_REQ) return false;
  return true;
}

export function middleware(req: NextRequest) {
  // Only rate-limit API routes (skip static & internals).
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anon";
    if (!rateLimit(ip)) {
      return new NextResponse(JSON.stringify({ error: "レート制限超過" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
