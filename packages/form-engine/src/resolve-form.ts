import { evaluateCondition } from './evaluate-condition';
import { calculateField } from './calculate-field';
import { Answers, FieldDefinition, FormDefinition } from './types';

// A field shows when it has no condition or its condition holds.  Answers to
// hidden fields stay in memory, so switching back restores them, but they are
// never validated or submitted.
export function resolveVisibleFields(definition: FormDefinition, answers: Answers): readonly FieldDefinition[] {
  return definition.fields.filter((field) => !field.showWhen || evaluateCondition(field.showWhen, answers));
}

// Pipes earlier answers into a label: "{{firstName|your guest}}" becomes the
// first name once it is answered, and the fallback text until then.
export function resolveLabel(label: string, answers: Answers): string {
  return label.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (_match, key: string, fallback: string | undefined) => {
    const value = answers[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number') return String(value);
    return fallback ?? '';
  });
}

// What a submission holds: the visible typed answers plus every visible calculated value.
export function resolveSubmission(definition: FormDefinition, answers: Answers): Answers {
  const submission: Record<string, Answers[string]> = {};
  for (const field of resolveVisibleFields(definition, answers)) {
    submission[field.key] = field.kind === 'calculated' ? calculateField(field.calculation, answers) : (answers[field.key] ?? null);
  }
  return submission;
}
