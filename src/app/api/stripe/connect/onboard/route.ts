import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOrRetrieveAccount, createOnboardingLink } from "@/lib/stripe-connect";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    const accountId = await createOrRetrieveAccount(session.user.id);
    const url = await createOnboardingLink(accountId);
    await writeAudit({
      userId: session.user.id,
      action: "STRIPE_CONNECT_ONBOARD_STARTED",
      target: accountId,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "onboard failed" },
      { status: 500 },
    );
  }
}
