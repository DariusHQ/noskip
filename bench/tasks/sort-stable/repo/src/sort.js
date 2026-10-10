export function sortBy(items, key) {
  return items.sort((a, b) => a[key] - b[key]);
}
