const COUPONS = { SAVE15: 15 }; // percent off

export function total(items, coupon) {
  let cents = 0;
  for (const item of items) cents += Math.round(item.price * 100) * (item.qty ?? 1);
  if (coupon) {
    const pct = COUPONS[coupon];
    if (pct === undefined) throw new Error('unknown coupon: ' + coupon);
    cents = Math.round((cents * (100 - pct)) / 100);
  }
  return cents / 100;
}
