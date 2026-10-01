import { DEFINITION_KIND } from '@penji-demos/constants';
import { FormDefinition, toDefinitionId } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { evaluateCondition } from './evaluate-condition';
import { resolveLabel, resolveSubmission, resolveVisibleFields } from './resolve-form';
import { validateDefinition } from './validate-definition';
import { validateForm } from './validate-form';

const FORM: FormDefinition = {
  kind: DEFINITION_KIND.FORM,
  id: toDefinitionId('request'),
  version: '1',
  title: 'Request',
  source: { title: 'Test', url: 'https://example.org' },
  description: '',
  fields: [
    { kind: 'text', key: 'name', label: 'Name', required: true },
    { kind: 'yesNo', key: 'urgent', label: 'Is it urgent for {{name|you}}?', required: true },
    { kind: 'text', key: 'reason', label: 'Why', showWhen: { kind: 'equals', field: 'urgent', value: true } },
    { kind: 'number', key: 'quantity', label: 'Quantity', required: true, min: 1, max: 10, wholeNumber: true },
    { kind: 'number', key: 'unitCost', label: 'Cost', required: true, min: 0 },
    { kind: 'calculated', key: 'total', label: 'Total', calculation: { kind: 'product', fields: ['quantity', 'unitCost'] }, format: 'currency' },
  ],
  rules: [{ id: 'reason-when-urgent', check: { kind: 'requiredWhen', field: 'reason', when: { kind: 'equals', field: 'urgent', value: true } }, reportOn: 'reason', message: 'Say why.' }],
};

describe('evaluateCondition', () => {
  it('compares numbers and dates, and never passes on a missing value', () => {
    expect(evaluateCondition({ kind: 'between', field: 'glucose', min: 100, max: 125 }, { glucose: 112 })).toBe(true);
    expect(evaluateCondition({ kind: 'atLeast', field: 'bmi', value: 25 }, { bmi: null })).toBe(false);
    expect(evaluateCondition({ kind: 'withinDaysBefore', field: 'tested', anchor: 'enrolled', days: 365 }, { tested: '2024-01-04', enrolled: '2025-01-02' })).toBe(true);
    expect(evaluateCondition({ kind: 'withinDaysBefore', field: 'tested', anchor: 'enrolled', days: 365 }, { tested: '2025-01-03', enrolled: '2025-01-02' })).toBe(false);
    expect(evaluateCondition({ kind: 'not', condition: { kind: 'answered', field: 'x' } }, {})).toBe(true);
  });
});

describe('forms from a definition', () => {
  it('shows a follow-up only when it applies and pipes earlier answers into labels', () => {
    expect(resolveVisibleFields(FORM, { urgent: false }).map((field) => field.key)).not.toContain('reason');
    expect(resolveLabel('Is it urgent for {{name|you}}?', { name: 'Malia' })).toBe('Is it urgent for Malia?');
  });

  it('validates fields and rules across fields, and submits only what showed', () => {
    expect(validateForm(FORM, { name: 'Malia', urgent: true, quantity: 2.5, unitCost: 4 })).toEqual({ reason: ['Say why.'], quantity: ['Enter a whole number.'] });
    expect(resolveSubmission(FORM, { name: 'Malia', urgent: false, reason: 'old', quantity: 2, unitCost: 4 })).toEqual({ name: 'Malia', urgent: false, quantity: 2, unitCost: 4, total: 8 });
  });

  it('checks the definition itself', () => {
    expect(validateDefinition(FORM)).toEqual([]);
    expect(validateDefinition({ ...FORM, rules: [], fields: [{ kind: 'text', key: 'a', label: '{{nmae}}', showWhen: { kind: 'answered', field: 'b' } }, { kind: 'text', key: 'b', label: 'B' }] })).toEqual([
      '"a" depends on "b", which comes after it.',
      'The label of "a" refers to "nmae", which is not a field.',
    ]);
  });
});
