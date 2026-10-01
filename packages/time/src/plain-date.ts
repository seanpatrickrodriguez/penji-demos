import { PlainDate } from '@penji-demos/types';

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

// Dates are read at UTC midnight, so no time zone or daylight saving change can move a day.
function epochMilliseconds(date: PlainDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromEpochMilliseconds(milliseconds: number): PlainDate {
  return toPlainDate(new Date(milliseconds).toISOString().slice(0, 10));
}

export function isPlainDate(value: string): boolean {
  const match = PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === (month ?? 0) - 1 && parsed.getUTCDate() === day;
}

// The boundary where text becomes a PlainDate.
export function toPlainDate(value: string): PlainDate {
  if (!isPlainDate(value)) throw new RangeError(`Not a calendar date: ${value}`);
  return value as PlainDate;
}

export const isBefore = (a: PlainDate, b: PlainDate): boolean => a < b;
export const isOnOrAfter = (a: PlainDate, b: PlainDate): boolean => a >= b;

export function calculateDaysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((epochMilliseconds(to) - epochMilliseconds(from)) / MILLISECONDS_PER_DAY);
}

export function resolveDaysLater(date: PlainDate, days: number): PlainDate {
  return fromEpochMilliseconds(epochMilliseconds(date) + days * MILLISECONDS_PER_DAY);
}

// The same day of the month, months later; a day that month lacks becomes its last day
// (January 31 plus one month is February 28 or 29).
export function resolveMonthsLater(date: PlainDate, months: number): PlainDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromEpochMilliseconds(target.getTime());
}

export function resolveFirstOfMonth(date: PlainDate): PlainDate {
  return toPlainDate(`${date.slice(0, 7)}-01`);
}

// Whole months from one date to another: the largest n with from + n months on or before to.
export function calculateFullMonthsBetween(from: PlainDate, to: PlainDate): number {
  if (isBefore(to, from)) return -calculateFullMonthsBetween(to, from);
  let months = 0;
  while (!isBefore(to, resolveMonthsLater(from, months + 1))) months += 1;
  return months;
}

// Month n of a program that began on `start`: month 1 runs from the start up to,
// but not including, the same day one month later.
export function resolveProgramMonth(start: PlainDate, date: PlainDate): number {
  return calculateFullMonthsBetween(start, date) + 1;
}

// The first day of program month n.  "The beginning of the 4th month" is resolveProgramMonthStart(start, 4).
export function resolveProgramMonthStart(start: PlainDate, programMonth: number): PlainDate {
  return resolveMonthsLater(start, programMonth - 1);
}
