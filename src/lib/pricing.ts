import { prisma } from "@/lib/prisma";
import type { Coupon } from "@prisma/client";

export type PriceBreakdown = {
  subtotalJpy: number;
  discountJpy: number;
  platformFeeJpy: number;
  providerEarningsJpy: number;
  totalJpy: number;
  couponCode?: string;
};

// マーケットプレイス収益の心臓部。
// 1) サービス価格 = subtotal
// 2) クーポン適用で discount 計算
// 3) プロバイダ固有のフィー率（platformFeeBps）で手数料計算
// 4) total = subtotal - discount（顧客請求額）
// 5) providerEarnings = total - platformFee（プロバイダ入金額）
export async function calculateBookingPrice(args: {
  serviceId: string;
  couponCode?: string | null;
}): Promise<PriceBreakdown> {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: args.serviceId },
    include: { provider: { select: { platformFeeBps: true } } },
  });

  const subtotalJpy = service.priceJpy;

  let discountJpy = 0;
  let appliedCoupon: Coupon | null = null;
  if (args.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: args.couponCode } });
    if (coupon && isCouponRedeemable(coupon)) {
      appliedCoupon = coupon;
      if (coupon.kind === "PERCENT" && coupon.percentBps) {
        discountJpy = Math.floor((subtotalJpy * coupon.percentBps) / 10000);
      } else if (coupon.kind === "FIXED" && coupon.valueJpy) {
        discountJpy = Math.min(subtotalJpy, coupon.valueJpy);
      }
    }
  }

  const totalJpy = Math.max(0, subtotalJpy - discountJpy);
  const feeBps = service.provider.platformFeeBps;
  const platformFeeJpy = Math.floor((totalJpy * feeBps) / 10000);
  const providerEarningsJpy = totalJpy - platformFeeJpy;

  return {
    subtotalJpy,
    discountJpy,
    platformFeeJpy,
    providerEarningsJpy,
    totalJpy,
    couponCode: appliedCoupon?.code,
  };
}

export function isCouponRedeemable(c: Coupon): boolean {
  if (!c.active) return false;
  const now = new Date();
  if (c.validFrom && c.validFrom > now) return false;
  if (c.validUntil && c.validUntil < now) return false;
  if (c.maxRedemptions != null && c.redeemedCount >= c.maxRedemptions) return false;
  return true;
}
