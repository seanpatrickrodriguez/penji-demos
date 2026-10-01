import { Answers, Calculation } from './types';

const MILLISECONDS_PER_DAY = 86_400_000;

// Returns null until every input the calculation needs is answered.
export function calculateField(calculation: Calculation, answers: Answers): number | null {
  switch (calculation.kind) {
    case 'product': {
      let result = calculation.factor ?? 1;
      for (const key of calculation.fields) {
        const value = answers[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) return null;
        result *= value;
      }
      return result;
    }
    case 'daysBetween': {
      const from = parseDate(answers[calculation.from]);
      const to = parseDate(answers[calculation.to]);
      if (from === null || to === null) return null;
      return Math.round((to - from) / MILLISECONDS_PER_DAY);
    }
  }
}

// Dates are stored as the yyyy-mm-dd text a date input produces, read at UTC midnight
// so a daylight saving change never shifts a day count.
export function parseDate(value: Answers[string] | undefined): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}
