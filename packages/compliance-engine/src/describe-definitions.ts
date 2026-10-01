import { RULE_CHECK_KIND } from '@penji-demos/constants';
import { describeAnswer } from '@penji-demos/form-engine';
import { Condition, FieldDefinition, RuleCheck } from '@penji-demos/types';
import { FieldLabels } from './compliance-subject';

// Plain-language readings of conditions and rule checks, so a page can show
// any standard's rules exactly as they are defined.  `fields` are the form
// fields whose choices name the values ("Mooring lines and hardware", not "mooring").

export function describeCondition(condition: Condition, labels: FieldLabels, fields: readonly FieldDefinition[] = []): string {
  const label = (field: string) => labels[field] ?? field;
  const value = (field: string, answer: Parameters<typeof describeAnswer>[1]) => describeAnswer(fields.find((candidate) => candidate.key === field), answer);
  const inner = (nested: Condition) => describeCondition(nested, labels, fields);
  switch (condition.kind) {
    case 'equals':
      return `${label(condition.field)} is ${value(condition.field, condition.value)}`;
    case 'oneOf':
      return `${label(condition.field)} is ${condition.values.map((each) => value(condition.field, each)).join(' or ')}`;
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
      return `not (${inner(condition.condition)})`;
    case 'all':
      return condition.conditions.map(inner).join(', and ');
    case 'any':
      return condition.conditions.map((nested) => (nested.kind === 'all' ? `(${inner(nested)})` : inner(nested))).join(', or ');
  }
}

// `eventNoun` names one dated event in the subject's history: a session, an item.
export function describeRuleCheck(check: RuleCheck, labels: FieldLabels, fields: readonly FieldDefinition[] = [], eventNoun = 'session'): string {
  const label = (field: string) => labels[field] ?? field;
  const condition = (nested: Condition) => describeCondition(nested, labels, fields);
  const plural = (count: number) => `${eventNoun}${count === 1 ? '' : 's'}`;
  switch (check.kind) {
    case RULE_CHECK_KIND.RANGE:
      return `${label(check.field)} is ${check.min} to ${check.max} ${check.unit}`;
    case RULE_CHECK_KIND.REQUIRED:
      return `${label(check.field)} is recorded`;
    case RULE_CHECK_KIND.REQUIRED_WHEN:
      return `${label(check.field)} is recorded when ${condition(check.when)}`;
    case RULE_CHECK_KIND.CONDITION:
      return condition(check.condition);
    case RULE_CHECK_KIND.SAME_DATE_VALUES_MATCH:
      return `${label(check.field)} is the same on ${plural(2)} sharing a date`;
    case RULE_CHECK_KIND.AT_MOST_PER_WINDOW:
      return `At most ${check.max} ${plural(check.max)} where ${condition(check.counts)}, in any ${check.windowDays} day${check.windowDays === 1 ? '' : 's'}`;
    case RULE_CHECK_KIND.WITHIN_DAYS_OF_ANCHOR:
      return `${label(check.field)} is within ${check.days} days after ${label(check.anchor)}`;
    case RULE_CHECK_KIND.NOT_BEFORE_ANCHOR:
      return `Each ${eventNoun} is on or after ${label(check.anchor)}`;
    case RULE_CHECK_KIND.CHANGE_AT_MOST:
      return `${label(check.field)} changes by at most ${check.percent}% between ${plural(2)}`;
  }
}
