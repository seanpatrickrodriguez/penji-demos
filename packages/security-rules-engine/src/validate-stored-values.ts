import { STORED_TEXT_LIMIT } from '@penji-demos/constants';
import { AnswerValue, Answers, FieldDefinition, FormDefinition } from '@penji-demos/types';

// What a stored record's values must look like, read from its form: only the
// form's own fields, each the right type and within the form's limits, and
// every field the form always requires.  The security rules hold the same
// checks, generated from the same form; this is how the page reads them.
// A field that shows only under a condition is checked when present.

export const DATE_PATTERN = '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
const DATE = new RegExp(DATE_PATTERN);

export type StoredField = Exclude<FieldDefinition, { readonly kind: 'calculated' }>;

export const resolveStoredFields = (form: FormDefinition): readonly StoredField[] =>
  form.fields.filter((field): field is StoredField => field.kind !== 'calculated');

export const isAlwaysRequired = (field: StoredField): boolean => field.required === true && field.showWhen === undefined;

export const resolveTextLimit = (field: StoredField): number => (field.kind === 'text' ? (field.maxLength ?? STORED_TEXT_LIMIT) : STORED_TEXT_LIMIT);

// Whether one present, non-empty value fits its field.
export function isStoredValue(field: StoredField, value: AnswerValue): boolean {
  switch (field.kind) {
    case 'text':
      return typeof value === 'string' && value.length <= resolveTextLimit(field);
    case 'number':
      return (
        typeof value === 'number' &&
        (field.wholeNumber !== true || Number.isInteger(value)) &&
        (field.min === undefined || value >= field.min) &&
        (field.max === undefined || value <= field.max)
      );
    case 'date':
      return typeof value === 'string' && DATE.test(value);
    case 'choice':
      return typeof value === 'string' && field.options.some((option) => option.value === value);
    case 'yesNo':
      return typeof value === 'boolean';
  }
}

// The problems with a record's values, in the form's field order; none means the rules accept them.
export function validateStoredValues(form: FormDefinition, values: Answers): readonly string[] {
  const fields = resolveStoredFields(form);
  const known = new Set(fields.map((field) => field.key));
  const problems: string[] = Object.keys(values)
    .filter((key) => !known.has(key))
    .map((key) => `"${key}" is not a field on the ${form.title.toLowerCase()} form.`);
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined || value === null) {
      if (isAlwaysRequired(field)) problems.push(`${field.label} is required.`);
    } else if (!isStoredValue(field, value)) {
      problems.push(`${field.label} does not fit the form: ${describeFieldRule(field)}.`);
    }
  }
  return problems;
}

// What a field accepts, in words.
export function describeFieldRule(field: StoredField): string {
  switch (field.kind) {
    case 'text':
      return `text of at most ${resolveTextLimit(field)} characters`;
    case 'number': {
      const kind = field.wholeNumber === true ? 'a whole number' : 'a number';
      if (field.min !== undefined && field.max !== undefined) return `${kind} from ${field.min} to ${field.max}`;
      if (field.min !== undefined) return `${kind} of at least ${field.min}`;
      if (field.max !== undefined) return `${kind} of at most ${field.max}`;
      return kind;
    }
    case 'date':
      return 'a date written YYYY-MM-DD';
    case 'choice':
      return `one of ${field.options.map((option) => option.label).join(', ')}`;
    case 'yesNo':
      return 'yes or no';
  }
}
