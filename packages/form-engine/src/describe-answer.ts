import { AnswerValue, FieldDefinition } from './types';

// An answer as a person reads it: a choice by its label, yes or no, a
// currency field in dollars.  Without the field, the value as it is stored.
export function describeAnswer(field: FieldDefinition | undefined, value: AnswerValue | undefined): string {
  if (value === null || value === undefined || value === '') return 'not recorded';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') {
    if (field?.kind === 'calculated' && field.format === 'currency') {
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2 });
    }
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  if (field?.kind === 'choice') return field.options.find((option) => option.value === value)?.label ?? value;
  return value;
}
