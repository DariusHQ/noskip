export function isValidName(name) {
  return /^[A-Za-z ]{2,50}$/.test(name);
}
