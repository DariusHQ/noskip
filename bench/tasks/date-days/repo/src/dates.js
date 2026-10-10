const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from, to) {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  return Math.floor((end - start) / DAY);
}
