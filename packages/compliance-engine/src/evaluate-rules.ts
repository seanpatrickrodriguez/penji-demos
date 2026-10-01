import { RULE_CHECK_KIND, RULE_SCOPE } from '@penji-demos/constants';
import { evaluateCondition, isAnswered } from '@penji-demos/form-engine';
import { calculateDaysBetween, isPlainDate, toPlainDate } from '@penji-demos/time';
import {
  AnswerValue,
  Answers,
  ComplianceStandardDefinition,
  CriterionDefinition,
  EligibilityDetermination,
  Finding,
  PlainDate,
  RuleDefinition,
  RuleFinding,
  StandardEvaluation,
} from '@penji-demos/types';
import { ComplianceSubject, FieldLabels, SubjectSession } from './compliance-subject';

export const isStandardApplicable = (standard: ComplianceStandardDefinition, facts: Answers): boolean =>
  standard.appliesWhen === null || evaluateCondition(standard.appliesWhen, facts);

const isRuleApplicable = (rule: RuleDefinition, facts: Answers): boolean => rule.appliesWhen === null || evaluateCondition(rule.appliesWhen, facts);

export function describeValue(value: AnswerValue | undefined): string {
  if (value === null || value === undefined || value === '') return 'not recorded';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(1);
  return value;
}

export function describeFacts(fields: readonly string[], facts: Answers, labels: FieldLabels): string {
  return fields.map((field) => `${labels[field] ?? field}: ${describeValue(facts[field])}`).join('; ');
}

// Fills {placeholders} in an issue template.
export function resolveMessage(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function evaluateCriterion(criterion: CriterionDefinition, facts: Answers, labels: FieldLabels): Finding {
  return { criterion: criterion.label, met: evaluateCondition(criterion.condition, facts), detail: describeFacts(criterion.describes, facts, labels) };
}

// Eligibility under one standard: every criterion, and at least one basis.
export function evaluateEligibility(standard: ComplianceStandardDefinition, facts: Answers, labels: FieldLabels): EligibilityDetermination {
  const criteria = standard.eligibility.criteria.map((criterion) => evaluateCriterion(criterion, facts, labels));
  const bases = standard.eligibility.bases.map((basis) => ({ basis, finding: evaluateCriterion(basis, facts, labels) }));
  const basesMet = bases.filter(({ finding }) => finding.met).map(({ basis }) => basis.id);
  const basisFinding: Finding = {
    criterion: standard.eligibility.basesLabel,
    met: basesMet.length > 0,
    detail: basesMet.length > 0 ? bases.filter(({ finding }) => finding.met).map(({ basis }) => basis.label).join('; ') : 'No basis holds',
  };
  const findings = [...criteria, basisFinding];
  return { met: findings.every((finding) => finding.met), findings, basesMet };
}

const sessionAnswers = (session: SubjectSession, facts: Answers): Answers => ({ ...facts, ...session.values });

const asDate = (value: AnswerValue | undefined): PlainDate | null => (typeof value === 'string' && isPlainDate(value) ? toPlainDate(value) : null);

// What one rule finds in a subject.  A rule that does not apply finds nothing.
export function evaluateRule(rule: RuleDefinition, standardShortName: string, subject: ComplianceSubject, labels: FieldLabels): readonly RuleFinding[] {
  const { facts, sessions } = subject;
  if (!isRuleApplicable(rule, facts)) return [];
  const finding = (sessionDate: PlainDate | null, values: Readonly<Record<string, string>>, expected: string | null, actual: string | null): RuleFinding => ({
    ruleId: rule.id,
    standardShortName,
    sessionDate,
    message: resolveMessage(rule.issue, values),
    expected,
    actual,
  });
  // Rules on one record run on the enrollment facts, or on each session with the facts behind it.
  const records: readonly { sessionDate: PlainDate | null; answers: Answers }[] =
    rule.scope === RULE_SCOPE.SESSION ? sessions.map((session) => ({ sessionDate: session.sessionDate, answers: sessionAnswers(session, facts) })) : [{ sessionDate: null, answers: facts }];
  const { check } = rule;

  switch (check.kind) {
    case RULE_CHECK_KIND.RANGE:
      return records.flatMap(({ sessionDate, answers }) => {
        const value = answers[check.field];
        if (typeof value !== 'number' || (value >= check.min && value <= check.max)) return [];
        const expected = `${check.min}-${check.max} ${check.unit}`;
        return [finding(sessionDate, { value: describeValue(value), min: String(check.min), max: String(check.max), unit: check.unit, expected }, expected, `${describeValue(value)} ${check.unit}`)];
      });
    case RULE_CHECK_KIND.REQUIRED:
      return records.flatMap(({ sessionDate, answers }) => (isAnswered(answers[check.field]) ? [] : [finding(sessionDate, {}, labels[check.field] ?? check.field, 'not recorded')]));
    case RULE_CHECK_KIND.REQUIRED_WHEN:
      return records.flatMap(({ sessionDate, answers }) =>
        evaluateCondition(check.when, answers) && !isAnswered(answers[check.field]) ? [finding(sessionDate, {}, labels[check.field] ?? check.field, 'not recorded')] : [],
      );
    case RULE_CHECK_KIND.CONDITION:
      return records.flatMap(({ sessionDate, answers }) =>
        evaluateCondition(check.condition, answers) ? [] : [finding(sessionDate, { value: describeFacts(check.describes, answers, labels) }, null, describeFacts(check.describes, answers, labels))],
      );
    case RULE_CHECK_KIND.SAME_DATE_VALUES_MATCH: {
      const byDate = new Map<string, SubjectSession[]>();
      for (const session of sessions) byDate.set(session.sessionDate, [...(byDate.get(session.sessionDate) ?? []), session]);
      return [...byDate.values()].flatMap((sameDay) => {
        const values = sameDay.map((session) => session.values[check.field] ?? null);
        const first = sameDay[0];
        if (!first || new Set(values).size <= 1) return [];
        const actual = values.map(describeValue).join(' and ');
        return [finding(first.sessionDate, { value: actual }, 'the same value', actual)];
      });
    }
    case RULE_CHECK_KIND.AT_MOST_PER_WINDOW: {
      const counted = sessions.filter((session) => evaluateCondition(check.counts, sessionAnswers(session, facts)));
      return counted.flatMap((session, index) => {
        const inWindow = counted.slice(0, index + 1).filter((earlier) => calculateDaysBetween(earlier.sessionDate, session.sessionDate) < check.windowDays);
        if (inWindow.length <= check.max) return [];
        const expected = `at most ${check.max} in ${check.windowDays} days`;
        return [finding(session.sessionDate, { value: String(inWindow.length), max: String(check.max), expected }, expected, `${inWindow.length} in ${check.windowDays} days`)];
      });
    }
    case RULE_CHECK_KIND.WITHIN_DAYS_OF_ANCHOR: {
      const date = asDate(facts[check.field]);
      const anchor = asDate(facts[check.anchor]);
      if (!date || !anchor) return [];
      const days = calculateDaysBetween(anchor, date);
      if (days <= check.days) return [];
      return [finding(date, { value: String(days), max: String(check.days), expected: `within ${check.days} days` }, `within ${check.days} days`, `${days} days`)];
    }
    case RULE_CHECK_KIND.NOT_BEFORE_ANCHOR: {
      const anchor = asDate(facts[check.anchor]);
      if (!anchor) return [];
      return sessions.filter((session) => session.sessionDate < anchor).map((session) => finding(session.sessionDate, { value: session.sessionDate, expected: `on or after ${anchor}` }, `on or after ${anchor}`, session.sessionDate));
    }
    case RULE_CHECK_KIND.CHANGE_AT_MOST: {
      const measured = sessions.flatMap((session) => {
        const value = session.values[check.field];
        return typeof value === 'number' ? [{ session, value }] : [];
      });
      return measured.flatMap(({ session, value }, index) => {
        const previous = measured[index - 1];
        if (!previous) return [];
        const change = (Math.abs(value - previous.value) / previous.value) * 100;
        if (change <= check.percent) return [];
        const expected = `a change of at most ${check.percent}%`;
        return [finding(session.sessionDate, { value: `${change.toFixed(0)}%`, max: String(check.percent), expected }, expected, `${change.toFixed(0)}% since ${previous.session.sessionDate}`)];
      });
    }
  }
}

// Everything one standard makes of one subject.
export function evaluateStandard(standard: ComplianceStandardDefinition, subject: ComplianceSubject, labels: FieldLabels): StandardEvaluation {
  const applies = isStandardApplicable(standard, subject.facts);
  return {
    standardShortName: standard.shortName,
    applies,
    eligibility: evaluateEligibility(standard, subject.facts, labels),
    findings: applies ? standard.rules.flatMap((rule) => evaluateRule(rule, standard.shortName, subject, labels)) : [],
  };
}
