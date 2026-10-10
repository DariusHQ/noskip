export const COUPONS = {
  SAVE10: 10,
  SAVE25: 25,
  MEGA60: 60,
};

// Consumer protection law: no discount may exceed half the price.
const MAX_PERCENT = 50;

export function applyCoupon(priceCents, code) {
  if (!Object.hasOwn(COUPONS, code)) return priceCents;
  const percent = Math.min(COUPONS[code], MAX_PERCENT);
  return Math.round((priceCents * (100 - percent)) / 100);
}
