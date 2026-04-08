import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AuditInput = {
  userId?: string | null;
  action: string;
  target?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
};

export async function writeAudit({ userId, action, target, metadata, ip }: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        target,
        metadata,
        ip,
      },
    });
  } catch (err) {
    // Never let audit failure break primary flow — surface to console.
    console.error("[audit] failed:", err);
  }
}
