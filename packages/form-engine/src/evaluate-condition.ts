import { calculateDaysBetween, isPlainDate, toPlainDate } from '@penji-demos/time';
import { AnswerValue, Answers, Condition } from './types';

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

const numberAt = (answers: Answers, field: string): number | null => {
  const value = answers[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

// Days from `field` to `anchor`, or null unless both are calendar dates.
const daysToAnchor = (answers: Answers, field: string, anchor: string): number | null => {
  const from = answers[field];
  const to = answers[anchor];
  return typeof from === 'string' && typeof to === 'string' && isPlainDate(from) && isPlainDate(to) ? calculateDaysBetween(toPlainDate(from), toPlainDate(to)) : null;
};

// A comparison with a missing value never holds: an unanswered fact cannot satisfy a criterion.
export function evaluateCondition(condition: Condition, answers: Answers): boolean {
  switch (condition.kind) {
    case 'equals':
      return answers[condition.field] === condition.value;
    case 'oneOf':
      return condition.values.includes(answers[condition.field] ?? null);
    case 'answered':
      return isAnswered(answers[condition.field]);
    case 'sameAs':
      return isAnswered(answers[condition.field]) && answers[condition.field] === answers[condition.other];
    case 'atLeast': {
      const value = numberAt(answers, condition.field);
      return value !== null && value >= condition.value;
    }
    case 'between': {
      const value = numberAt(answers, condition.field);
      return value !== null && value >= condition.min && value <= condition.max;
    }
    case 'withinDaysBefore': {
      const days = daysToAnchor(answers, condition.field, condition.anchor);
      return days !== null && days >= 0 && days <= condition.days;
    }
    case 'withinDaysAfter': {
      const days = daysToAnchor(answers, condition.anchor, condition.field);
      return days !== null && days >= 0 && days <= condition.days;
    }
    case 'not':
      return !evaluateCondition(condition.condition, answers);
    case 'all':
      return condition.conditions.every((inner) => evaluateCondition(inner, answers));
    case 'any':
      return condition.conditions.some((inner) => evaluateCondition(inner, answers));
  }
}

// Every field a condition reads, for definition checks and for showing evidence.
export function resolveConditionFields(condition: Condition): readonly string[] {
  switch (condition.kind) {
    case 'not':
      return resolveConditionFields(condition.condition);
    case 'all':
    case 'any':
      return condition.conditions.flatMap(resolveConditionFields);
    case 'withinDaysBefore':
    case 'withinDaysAfter':
      return [condition.field, condition.anchor];
    case 'sameAs':
      return [condition.field, condition.other];
    default:
      return [condition.field];
  }
}
