export const COUPONS = {
  SAVE10: 10,
  SAVE25: 25,
  MEGA60: 60,
};

export function applyCoupon(priceCents, code) {
  const percent = COUPONS[code];
  return Math.round((priceCents * (100 - percent)) / 100);
}
