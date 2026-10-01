import { AnswerValue, Answers, Condition } from './types';

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

export function evaluateCondition(condition: Condition, answers: Answers): boolean {
  switch (condition.kind) {
    case 'equals':
      return answers[condition.field] === condition.value;
    case 'oneOf':
      return condition.values.includes(answers[condition.field] ?? null);
    case 'answered':
      return isAnswered(answers[condition.field]);
    case 'all':
      return condition.conditions.every((inner) => evaluateCondition(inner, answers));
    case 'any':
      return condition.conditions.some((inner) => evaluateCondition(inner, answers));
  }
}
