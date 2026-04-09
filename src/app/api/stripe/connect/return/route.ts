import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { refreshAccountStatus } from "@/lib/stripe-connect";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Return URL from Stripe onboarding. Refreshes the account status and
 * redirects the user back to the dashboard.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!session?.user) {
    return NextResponse.redirect(`${base}/login`);
  }

  try {
    const status = await refreshAccountStatus(session.user.id);
    await writeAudit({
      userId: session.user.id,
      action: "STRIPE_CONNECT_ONBOARD_RETURNED",
      metadata: status,
    });
  } catch (e) {
    console.warn("[connect/return] refresh failed:", e);
  }

  const url = new URL(`${base}/dashboard/connect`);
  url.searchParams.set("return", "1");
  return NextResponse.redirect(url);
}
