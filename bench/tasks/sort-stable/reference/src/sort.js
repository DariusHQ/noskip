export function sortBy(items, key) {
  // Array.prototype.sort is stable (ES2019); sort a copy so the input stays untouched.
  return [...items].sort((a, b) => a[key] - b[key]);
}
