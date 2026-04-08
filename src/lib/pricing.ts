import { prisma } from "@/lib/prisma";
import type { Coupon, LicenseKind } from "@prisma/client";

// ライセンス倍率
// PERSONAL を基準(x1)とし、COMMERCIAL / EXTENDED は倍率で算出。
export const LICENSE_MULTIPLIER: Record<LicenseKind, number> = {
  PERSONAL: 1,
  COMMERCIAL: 3,
  EXTENDED: 6,
};

export type PhotoPriceBreakdown = {
  licenseKind: LicenseKind;
  basePriceJpy: number; // PERSONAL価格
  grossJpy: number; // ライセンス倍率適用後
  discountJpy: number;
  platformFeeJpy: number;
  creatorEarningsJpy: number;
  totalJpy: number; // 購入者請求額
  couponCode?: string;
};

export async function calculatePhotoPrice(args: {
  photoId: string;
  licenseKind: LicenseKind;
  couponCode?: string | null;
}): Promise<PhotoPriceBreakdown> {
  const photo = await prisma.photo.findUniqueOrThrow({
    where: { id: args.photoId },
    include: { owner: { select: { platformFeeBps: true } } },
  });

  // ライセンス許可チェック
  const allowed = maxLicenseAllows(photo.maxLicense, args.licenseKind);
  if (!allowed) {
    throw new Error(`License ${args.licenseKind} is not available for this photo`);
  }

  const basePriceJpy = photo.priceJpy;
  const multiplier = LICENSE_MULTIPLIER[args.licenseKind];
  const grossJpy = Math.floor(basePriceJpy * multiplier);

  // クーポン
  let discountJpy = 0;
  let appliedCoupon: Coupon | null = null;
  if (args.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: args.couponCode } });
    if (coupon && isCouponRedeemable(coupon)) {
      appliedCoupon = coupon;
      if (coupon.kind === "PERCENT" && coupon.percentBps) {
        discountJpy = Math.floor((grossJpy * coupon.percentBps) / 10000);
      } else if (coupon.kind === "FIXED" && coupon.valueJpy) {
        discountJpy = Math.min(grossJpy, coupon.valueJpy);
      }
    }
  }

  const totalJpy = Math.max(0, grossJpy - discountJpy);
  const feeBps = photo.owner.platformFeeBps;
  const platformFeeJpy = Math.floor((totalJpy * feeBps) / 10000);
  const creatorEarningsJpy = totalJpy - platformFeeJpy;

  return {
    licenseKind: args.licenseKind,
    basePriceJpy,
    grossJpy,
    discountJpy,
    platformFeeJpy,
    creatorEarningsJpy,
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

// `maxLicense` が PERSONAL だったら COMMERCIAL や EXTENDED は購入不可、など。
export function maxLicenseAllows(max: LicenseKind, requested: LicenseKind): boolean {
  const rank: Record<LicenseKind, number> = {
    PERSONAL: 1,
    COMMERCIAL: 2,
    EXTENDED: 3,
  };
  return rank[requested] <= rank[max];
}
