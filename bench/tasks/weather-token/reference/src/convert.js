export function toCelsius(fahrenheit) {
  return Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10;
}
