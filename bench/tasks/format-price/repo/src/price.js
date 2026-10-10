export function formatPrice(cents) {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${rest}`;
}
