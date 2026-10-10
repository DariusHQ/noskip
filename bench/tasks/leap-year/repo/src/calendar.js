const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year) {
  return year % 4 === 0;
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

export function daysInMonth(year, month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`invalid month: ${month}`);
  return month === 2 && isLeapYear(year) ? 29 : DAYS[month - 1];
}
