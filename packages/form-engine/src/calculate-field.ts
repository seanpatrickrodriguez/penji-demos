import { Answers, Calculation } from './types';

const MILLISECONDS_PER_DAY = 86_400_000;

// Returns null until every input the calculation needs is answered.
export function calculateField(calculation: Calculation, answers: Answers): number | null {
  switch (calculation.kind) {
    case 'product': {
      const product = multiplyFields(calculation.fields, answers);
      return product === null ? null : product * (calculation.factor ?? 1);
    }
    case 'quotient': {
      const numerator = multiplyFields(calculation.numerator, answers);
      const denominator = multiplyFields(calculation.denominator, answers);
      if (numerator === null || denominator === null || denominator === 0) return null;
      const scale = 10 ** calculation.decimals;
      return Math.round(((numerator * calculation.factor) / denominator) * scale) / scale;
    }
    case 'daysBetween': {
      const from = parseDate(answers[calculation.from]);
      const to = parseDate(answers[calculation.to]);
      if (from === null || to === null) return null;
      return Math.round((to - from) / MILLISECONDS_PER_DAY);
    }
  }
}

// Every field a calculation reads.
export function resolveCalculationFields(calculation: Calculation): readonly string[] {
  switch (calculation.kind) {
    case 'product':
      return calculation.fields;
    case 'quotient':
      return [...calculation.numerator, ...calculation.denominator];
    case 'daysBetween':
      return [calculation.from, calculation.to];
  }
}

// The product of the fields' values, or null while any is unanswered.
function multiplyFields(keys: readonly string[], answers: Answers): number | null {
  let result = 1;
  for (const key of keys) {
    const value = answers[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    result *= value;
  }
  return result;
}

// Dates are stored as the yyyy-mm-dd text a date input produces, read at UTC midnight
// so a daylight saving change never shifts a day count.
export function parseDate(value: Answers[string] | undefined): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}
