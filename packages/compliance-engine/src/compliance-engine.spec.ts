import { DEFINITION_KIND, GUIDANCE_ACTION_TYPE, RULE_CHECK_KIND, RULE_SCOPE, VALIDATION_SEVERITY } from '@penji-demos/constants';
import { toPlainDate } from '@penji-demos/time';
import { ComplianceStandardDefinition, FormDefinition, RuleDefinition, toDefinitionId } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { ComplianceSubject } from './compliance-subject';
import { evaluateStandard } from './evaluate-rules';
import { resolveConstrainedForm, resolveFieldConstraints } from './resolve-field-constraints';
import { describeRuleCheck } from './describe-definitions';
import { isRecordBlocked, resolveGuidanceItem, validateResolution } from './resolve-guidance';

// The engine is tested on a made-up domain, a swim program, to show it needs nothing from the DPRP.

const SOURCE = { title: 'Swim program rules', url: 'https://example.org/swim' };

const rule = (id: string, overrides: Partial<RuleDefinition> & Pick<RuleDefinition, 'scope' | 'check'>): RuleDefinition => ({
  id,
  title: id,
  citation: SOURCE,
  appliesWhen: null,
  severity: VALIDATION_SEVERITY.ERROR,
  blocks: true,
  bypassable: false,
  issue: 'Value {value} is outside {expected}.',
  guidance: 'Correct the value.',
  fixTarget: null,
  ...overrides,
});

const standard = (shortName: string, rules: readonly RuleDefinition[], appliesWhen: ComplianceStandardDefinition['appliesWhen'] = null): ComplianceStandardDefinition => ({
  kind: DEFINITION_KIND.STANDARD,
  id: toDefinitionId(shortName),
  version: '1',
  title: shortName,
  source: SOURCE,
  shortName,
  appliesWhen,
  eligibility: {
    criteria: [{ id: 'age', label: 'Age 8 or older', citation: SOURCE, condition: { kind: 'atLeast', field: 'age', value: 8 }, describes: ['age'] }],
    basesLabel: 'A way to qualify',
    bases: [
      { id: 'swim-test', label: 'Passed the swim test', citation: SOURCE, condition: { kind: 'equals', field: 'swimTestPassed', value: true }, describes: ['swimTestPassed'] },
      { id: 'lessons', label: 'Took lessons', citation: SOURCE, condition: { kind: 'equals', field: 'tookLessons', value: true }, describes: ['tookLessons'] },
    ],
  },
  rules,
  interpretations: [],
});

const LAP_RANGE = rule('lap-range', { scope: RULE_SCOPE.EVENT, check: { kind: RULE_CHECK_KIND.RANGE, field: 'laps', min: 1, max: 200, unit: 'laps' }, fixTarget: { form: 'session', field: 'laps' } });
const ONE_EXTRA_PER_WEEK = rule('extra-per-week', {
  scope: RULE_SCOPE.EVENT,
  check: { kind: RULE_CHECK_KIND.AT_MOST_PER_WINDOW, counts: { kind: 'equals', field: 'extra', value: true }, max: 1, windowDays: 7 },
  severity: VALIDATION_SEVERITY.WARNING,
  blocks: false,
  bypassable: true,
});
const BASIC = standard('Basic', [LAP_RANGE, ONE_EXTRA_PER_WEEK]);
const SQUAD = standard('Squad', [rule('squad-laps', { scope: RULE_SCOPE.EVENT, check: { kind: RULE_CHECK_KIND.RANGE, field: 'laps', min: 10, max: 120, unit: 'laps' } })], { kind: 'equals', field: 'squad', value: true });

const event = (date: string, values: Record<string, number | boolean | null>) => ({ eventDate: toPlainDate(date), values: { eventDate: date, ...values } });
const SUBJECT: ComplianceSubject = {
  facts: { age: 10, swimTestPassed: false, tookLessons: true, squad: false },
  events: [event('2025-03-03', { laps: 40, extra: false }), event('2025-03-04', { laps: 400, extra: true }), event('2025-03-06', { laps: 30, extra: true })],
};

describe('evaluateStandard', () => {
  it('judges eligibility by every criterion and at least one basis', () => {
    const evaluation = evaluateStandard(BASIC, SUBJECT, {});
    expect(evaluation.eligibility.met).toBe(true);
    expect(evaluation.eligibility.basesMet).toEqual(['lessons']);
  });

  it('finds a value out of range on the session it belongs to', () => {
    const [finding] = evaluateStandard(BASIC, SUBJECT, {}).findings.filter((found) => found.ruleId === 'lap-range');
    expect(finding).toMatchObject({ eventDate: '2025-03-04', message: 'Value 400 is outside 1-200 laps.', actual: '400 laps' });
  });

  it('counts across sessions within a window', () => {
    const found = evaluateStandard(BASIC, SUBJECT, {}).findings.filter((finding) => finding.ruleId === 'extra-per-week');
    expect(found.map((finding) => finding.eventDate)).toEqual(['2025-03-06']);
  });

  it('applies a standard only to the subjects its condition selects', () => {
    expect(evaluateStandard(SQUAD, SUBJECT, {}).applies).toBe(false);
    expect(evaluateStandard(SQUAD, SUBJECT, {}).findings).toEqual([]);
  });
});

describe('field constraints from several standards', () => {
  const FORM: FormDefinition = {
    kind: DEFINITION_KIND.FORM,
    id: toDefinitionId('swim-session'),
    version: '1',
    title: 'Session',
    source: SOURCE,
    description: '',
    fields: [{ kind: 'number', key: 'laps', label: 'Laps' }],
    rules: [],
  };

  it('merges ranges to the most restrictive and keeps where each came from', () => {
    const constraints = resolveFieldConstraints(FORM, RULE_SCOPE.EVENT, [BASIC, SQUAD], { squad: true });
    expect(constraints).toHaveLength(1);
    expect(constraints[0]).toMatchObject({ min: 10, max: 120 });
    expect(constraints[0]?.sources.map((source) => source.standardShortName)).toEqual(['Basic', 'Squad']);
    const field = resolveConstrainedForm(FORM, constraints).fields[0];
    expect(field?.kind === 'number' ? [field.min, field.max] : null).toEqual([10, 120]);
  });

  it('leaves out a standard that does not apply', () => {
    expect(resolveFieldConstraints(FORM, RULE_SCOPE.EVENT, [BASIC, SQUAD], { squad: false })[0]).toMatchObject({ min: 1, max: 200 });
  });
});

describe('guidance', () => {
  const findingFor = (ruleId: string) => {
    const found = evaluateStandard(BASIC, SUBJECT, {}).findings.find((finding) => finding.ruleId === ruleId);
    if (!found) throw new Error(`No finding for ${ruleId}`);
    return found;
  };
  const blocking = resolveGuidanceItem('swimmer-1', LAP_RANGE, findingFor('lap-range'), new Map());
  const warning = resolveGuidanceItem('swimmer-1', ONE_EXTRA_PER_WEEK, findingFor('extra-per-week'), new Map());

  it('offers change only with a field to fix, and accept only when the rule allows it', () => {
    expect(blocking.availableActions.map((action) => action.actionType)).toEqual([GUIDANCE_ACTION_TYPE.CHANGE, GUIDANCE_ACTION_TYPE.DEFER]);
    expect(warning.availableActions.map((action) => action.actionType)).toEqual([GUIDANCE_ACTION_TYPE.ACCEPT, GUIDANCE_ACTION_TYPE.DEFER]);
  });

  it('requires a reason to accept, and refuses actions the item does not offer', () => {
    expect(validateResolution(warning, GUIDANCE_ACTION_TYPE.ACCEPT, ' ')).toEqual(['Say why the record can stand as it is.']);
    expect(validateResolution(blocking, GUIDANCE_ACTION_TYPE.ACCEPT, 'Looks fine')).toEqual(['That action is not available for this item.']);
  });

  it('blocks the record while a blocking item is open', () => {
    expect(isRecordBlocked([blocking, warning])).toBe(true);
    expect(isRecordBlocked([warning])).toBe(false);
  });
});

describe('describing definitions', () => {
  it('reads rule checks and conditions in plain language', () => {
    const labels = { laps: 'Laps', extra: 'Extra session' };
    expect(describeRuleCheck(LAP_RANGE.check, labels)).toBe('Laps is 1 to 200 laps');
    expect(describeRuleCheck(ONE_EXTRA_PER_WEEK.check, labels)).toBe('At most 1 session where Extra session is yes, in any 7 days');
  });
});
