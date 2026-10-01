import { RULE_CHECK_KIND } from '@penji-demos/constants';
import { AnswerValue, Condition, RuleCheck } from '@penji-demos/types';
import { FieldLabels } from './compliance-subject';

// Plain-language readings of conditions and rule checks, so a page can show
// any standard's rules exactly as they are defined.

const describeAnswer = (value: AnswerValue): string => (value === true ? 'yes' : value === false ? 'no' : value === null ? 'not recorded' : String(value));

export function describeCondition(condition: Condition, labels: FieldLabels): string {
  const label = (field: string) => labels[field] ?? field;
  switch (condition.kind) {
    case 'equals':
      return `${label(condition.field)} is ${describeAnswer(condition.value)}`;
    case 'oneOf':
      return `${label(condition.field)} is ${condition.values.map(describeAnswer).join(' or ')}`;
    case 'answered':
      return `${label(condition.field)} is recorded`;
    case 'sameAs':
      return `${label(condition.field)} is the same as ${label(condition.other)}`;
    case 'atLeast':
      return `${label(condition.field)} is at least ${condition.value}`;
    case 'between':
      return `${label(condition.field)} is ${condition.min} to ${condition.max}`;
    case 'withinDaysBefore':
      return `${label(condition.field)} is within ${condition.days} days before ${label(condition.anchor)}`;
    case 'withinDaysAfter':
      return `${label(condition.field)} is within ${condition.days} days after ${label(condition.anchor)}`;
    case 'not':
      return `not (${describeCondition(condition.condition, labels)})`;
    case 'all':
      return condition.conditions.map((inner) => describeCondition(inner, labels)).join(', and ');
    case 'any':
      return condition.conditions.map((inner) => (inner.kind === 'all' ? `(${describeCondition(inner, labels)})` : describeCondition(inner, labels))).join(', or ');
  }
}

export function describeRuleCheck(check: RuleCheck, labels: FieldLabels): string {
  const label = (field: string) => labels[field] ?? field;
  switch (check.kind) {
    case RULE_CHECK_KIND.RANGE:
      return `${label(check.field)} is ${check.min} to ${check.max} ${check.unit}`;
    case RULE_CHECK_KIND.REQUIRED:
      return `${label(check.field)} is recorded`;
    case RULE_CHECK_KIND.REQUIRED_WHEN:
      return `${label(check.field)} is recorded when ${describeCondition(check.when, labels)}`;
    case RULE_CHECK_KIND.CONDITION:
      return describeCondition(check.condition, labels);
    case RULE_CHECK_KIND.SAME_DATE_VALUES_MATCH:
      return `${label(check.field)} is the same on sessions sharing a date`;
    case RULE_CHECK_KIND.AT_MOST_PER_WINDOW:
      return `At most ${check.max} session${check.max === 1 ? '' : 's'} where ${describeCondition(check.counts, labels)}, in any ${check.windowDays} day${check.windowDays === 1 ? '' : 's'}`;
    case RULE_CHECK_KIND.WITHIN_DAYS_OF_ANCHOR:
      return `${label(check.field)} is within ${check.days} days after ${label(check.anchor)}`;
    case RULE_CHECK_KIND.NOT_BEFORE_ANCHOR:
      return `Each session is on or after ${label(check.anchor)}`;
    case RULE_CHECK_KIND.CHANGE_AT_MOST:
      return `${label(check.field)} changes by at most ${check.percent}% between sessions`;
  }
}
