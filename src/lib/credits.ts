// Credit system.
//
// ユーザーは「クレジット」で画像生成・チケット編集を行う。
// - 都度購入: Stripe → CreditPurchase → CreditTransaction で加算
// - サブスク更新: 月初にプランに応じた枚数を加算
// - 消費: generation / ticket_edit で 1〜2 クレジット引き落とし

import { prisma } from "@/lib/prisma";

export const PLAN_MONTHLY_CREDITS = {
  FREE: 2,
  PRO: 30,
  UNLIMITED: 9999,
} as const;

export const CREDIT_PACKS = [
  { credits: 5, priceJpy: 490, label: "5枚パック" },
  { credits: 15, priceJpy: 980, label: "15枚パック" },
  { credits: 50, priceJpy: 2480, label: "50枚パック" },
] as const;

/**
 * ユーザーの残高を取得(なければ作成)。
 */
export async function getBalance(userId: string): Promise<number> {
  const bal = await prisma.creditBalance.upsert({
    where: { userId },
    update: {},
    create: { userId, credits: PLAN_MONTHLY_CREDITS.FREE },
    select: { credits: true },
  });
  return bal.credits;
}

/**
 * クレジットを消費する。残高不足なら false を返す(トランザクション安全)。
 */
export async function spendCredits(
  userId: string,
  amount: number,
  reason: string,
  sourceId?: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const bal = await tx.creditBalance.findUnique({ where: { userId } });
    if (!bal || bal.credits < amount) return false;

    await tx.creditBalance.update({
      where: { userId },
      data: { credits: { decrement: amount } },
    });
    await tx.creditTransaction.create({
      data: { userId, amount: -amount, reason, sourceId },
    });
    return true;
  });
}

/**
 * クレジットを追加する(購入、サブスク更新、ボーナス等)。
 */
export async function addCredits(
  userId: string,
  amount: number,
  reason: string,
  sourceId?: string,
): Promise<number> {
  const result = await prisma.$transaction(async (tx) => {
    const bal = await tx.creditBalance.upsert({
      where: { userId },
      update: { credits: { increment: amount } },
      create: { userId, credits: amount },
    });
    await tx.creditTransaction.create({
      data: { userId, amount, reason, sourceId },
    });
    return bal.credits;
  });
  return result;
}
