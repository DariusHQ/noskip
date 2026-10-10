const DAY = 24 * 60 * 60 * 1000;

function utc(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from, to) {
  return Math.round((utc(to) - utc(from)) / DAY);
}
