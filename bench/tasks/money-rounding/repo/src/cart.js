const COUPONS = { SAVE15: 0.15 };

export function total(items, coupon) {
  let sum = 0;
  for (const item of items) sum += item.price * (item.qty ?? 1);
  if (coupon) {
    const rate = COUPONS[coupon];
    if (rate === undefined) throw new Error('unknown coupon: ' + coupon);
    sum = sum - sum * rate;
  }
  return Math.floor(sum * 100) / 100;
}
