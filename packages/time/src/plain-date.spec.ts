import { describe, expect, it } from 'vitest';
import {
  calculateDaysBetween,
  calculateFullMonthsBetween,
  isPlainDate,
  resolveMonthsLater,
  resolveProgramMonth,
  resolveProgramMonthStart,
  toPlainDate,
} from './plain-date';

const d = toPlainDate;

describe('isPlainDate', () => {
  it('accepts real calendar dates only', () => {
    expect(isPlainDate('2024-02-29')).toBe(true);
    expect(isPlainDate('2025-02-29')).toBe(false);
    expect(isPlainDate('2025-13-01')).toBe(false);
    expect(isPlainDate('01/15/2025')).toBe(false);
  });
});

describe('calculateDaysBetween', () => {
  it('counts calendar days across a daylight saving change', () => {
    expect(calculateDaysBetween(d('2025-03-08'), d('2025-03-10'))).toBe(2);
    expect(calculateDaysBetween(d('2025-01-06'), d('2026-01-06'))).toBe(365);
  });
});

describe('resolveMonthsLater', () => {
  it('keeps the day of the month, or the last day when the month is shorter', () => {
    expect(resolveMonthsLater(d('2025-01-15'), 3)).toBe('2025-04-15');
    expect(resolveMonthsLater(d('2025-01-31'), 1)).toBe('2025-02-28');
    expect(resolveMonthsLater(d('2024-01-31'), 1)).toBe('2024-02-29');
  });
});

describe('calculateFullMonthsBetween', () => {
  it('counts a month only once the same day is reached', () => {
    expect(calculateFullMonthsBetween(d('2025-01-15'), d('2025-10-14'))).toBe(8);
    expect(calculateFullMonthsBetween(d('2025-01-15'), d('2025-10-15'))).toBe(9);
  });
});

describe('program months', () => {
  const start = d('2025-01-15');

  it('places a date in its program month', () => {
    expect(resolveProgramMonth(start, start)).toBe(1);
    expect(resolveProgramMonth(start, d('2025-07-14'))).toBe(6);
    expect(resolveProgramMonth(start, d('2025-07-15'))).toBe(7);
  });

  it('resolves the first day of a program month', () => {
    expect(resolveProgramMonthStart(start, 4)).toBe('2025-04-15');
    expect(resolveProgramMonthStart(start, 10)).toBe('2025-10-15');
  });
});
