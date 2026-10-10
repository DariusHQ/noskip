export function isValidName(name) {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 50 && /^[\p{L} '-]+$/u.test(trimmed);
}
