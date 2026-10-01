import { evaluateCondition, isAnswered } from './evaluate-condition';
import { parseDate } from './calculate-field';
import { resolveSubmission, resolveVisibleFields } from './resolve-form';
import { AnswerValue, Answers, CrossFieldRule, FieldDefinition, FieldErrors, FormDefinition } from './types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages are written for the person filling in the form: what to do, in plain words.
export function validateField(field: FieldDefinition, value: AnswerValue | undefined): readonly string[] {
  if (field.kind === 'calculated') return [];
  if (!isAnswered(value)) return field.required ? ['Please answer this question.'] : [];

  switch (field.kind) {
    case 'text': {
      const text = String(value).trim();
      const errors: string[] = [];
      if (field.inputType === 'email' && !EMAIL_PATTERN.test(text)) errors.push('Enter an email address like name@example.com.');
      if (field.maxLength !== undefined && text.length > field.maxLength) errors.push(`Keep this to ${field.maxLength} characters or fewer.`);
      return errors;
    }
    case 'number': {
      if (typeof value !== 'number') return ['Enter a number.'];
      const errors: string[] = [];
      if (field.wholeNumber && !Number.isInteger(value)) errors.push('Enter a whole number.');
      if (field.min !== undefined && value < field.min) errors.push(`Enter ${field.min} or more.`);
      if (field.max !== undefined && value > field.max) errors.push(`Enter ${field.max} or less.`);
      return errors;
    }
    case 'date':
      return parseDate(value) === null ? ['Enter a full date.'] : [];
    case 'choice':
      return field.options.some((option) => option.value === value) ? [] : ['Choose one of the options.'];
    case 'yesNo':
      return typeof value === 'boolean' ? [] : ['Choose Yes or No.'];
  }
}

// A cross-field rule runs only when every field it reads is visible and answered,
// so a person is never told two answers disagree before they have given both.
export function evaluateCrossFieldRule(rule: CrossFieldRule, answers: Answers, visibleKeys: ReadonlySet<string>): boolean {
  const { check } = rule;
  switch (check.kind) {
    case 'dateOnOrAfter': {
      if (!visibleKeys.has(check.earlier) || !visibleKeys.has(check.later)) return true;
      const earlier = parseDate(answers[check.earlier]);
      const later = parseDate(answers[check.later]);
      return earlier === null || later === null || later >= earlier;
    }
    case 'atMost': {
      if (!visibleKeys.has(check.field) || !visibleKeys.has(check.limit)) return true;
      const value = answers[check.field];
      const limit = answers[check.limit];
      return typeof value !== 'number' || typeof limit !== 'number' || value <= limit;
    }
    case 'requiredWhen':
      return !visibleKeys.has(check.field) || !evaluateCondition(check.when, answers) || isAnswered(answers[check.field]);
  }
}

// Rules read the same values a submission would hold, so a rule can compare a
// calculated total against a typed-in budget.
export function validateForm(definition: FormDefinition, answers: Answers): FieldErrors {
  const visible = resolveVisibleFields(definition, answers);
  const visibleKeys = new Set(visible.map((field) => field.key));
  const values = { ...answers, ...resolveSubmission(definition, answers) };
  const errors: Record<string, string[]> = {};

  for (const field of visible) {
    const fieldErrors = validateField(field, answers[field.key]);
    if (fieldErrors.length > 0) errors[field.key] = [...fieldErrors];
  }
  for (const rule of definition.rules) {
    if (!visibleKeys.has(rule.reportOn) || evaluateCrossFieldRule(rule, values, visibleKeys)) continue;
    (errors[rule.reportOn] ??= []).push(rule.message);
  }
  return errors;
}
