import { DPRP_REQUIREMENT_ID, METRIC_KEY, OUTCOME_PATHWAY, RECOGNITION_STATUS, REQUIREMENT_OUTCOME, RULE_CHECK_KIND, SESSION_FIELD, SESSION_TYPE_CODE, SUBMISSION_COLUMN } from '@penji-demos/constants';
import { validateRequirementDefinitions } from '@penji-demos/rule-engine';
import { toPlainDate } from '@penji-demos/time';
import { PROGRAM_CONFIGURATION } from '@penji-demos/dprp-configuration';
import { DPRP_DATA_DICTIONARY_2024, DPRP_STANDARD_2024 } from '@penji-demos/dprp-standard';
import { PlainDate, PlatformData } from '@penji-demos/types';
import { RecognitionStandardDefinition } from '@penji-demos/dprp-standard';
import { describe, expect, it } from 'vitest';
import { resolveSubmissionCsv, resolveSubmissionRows } from '../submission/resolve-submission-rows';
import { FULL_SCHEDULE, NO_BLOOD_TEST, ORGANIZATION_ID, ParticipantCase, buildCohort, buildEnrollment, buildOrganization, buildParticipant, buildSessions } from '../testing/build-records';
import { evaluateRecognition as evaluateRecognitionOf } from './evaluate-recognition';
import { DPRP_METRIC_REGISTRY } from './metric-registry';
import { resolveCohortWindow } from './resolve-evaluation-cohort';

const STANDARD = DPRP_STANDARD_2024;
const START = '2025-01-06';
const SUBMISSION = toPlainDate('2026-03-01');
const COHORT = buildCohort('C1', START);

const evaluateRecognition = (standard: RecognitionStandardDefinition, data: PlatformData, month: PlainDate) => evaluateRecognitionOf(standard, PROGRAM_CONFIGURATION, data, ORGANIZATION_ID, month);

// Ten eligible participants: six complete the year losing 6%, two complete without
// losing weight, two leave after month 2.  Completers 8/10, risk reduced 6/8.
function buildDefaultParticipants(enrollment = buildEnrollment()): readonly ParticipantCase[] {
  const completers = Array.from({ length: 6 }, (_, index) => buildParticipant(`P${index + 1}`, COHORT, buildSessions(START, FULL_SCHEDULE, 220, 206.8), { enrollment }));
  const steady = Array.from({ length: 2 }, (_, index) => buildParticipant(`S${index + 1}`, COHORT, buildSessions(START, FULL_SCHEDULE, 220, 219), { enrollment }));
  const leavers = Array.from({ length: 2 }, (_, index) => buildParticipant(`L${index + 1}`, COHORT, buildSessions(START, [0, 7, 14, 21, 28, 35], 220, 218), { enrollment }));
  return [...completers, ...steady, ...leavers];
}
const buildDefaultOrganization = () => buildOrganization([COHORT], buildDefaultParticipants());

const result = (evaluation: ReturnType<typeof evaluateRecognition>, id: string) => evaluation.requirements.find((entry) => entry.requirement.id === id);

describe('evaluation cohort', () => {
  it('looks at cohorts that began 12 to 18 months before the submission month', () => {
    expect(resolveCohortWindow(STANDARD, toPlainDate('2026-03-15'))).toEqual({ firstSessionOnOrAfter: '2024-09-01', firstSessionBefore: '2025-03-01' });
  });

  it('leaves out a cohort that began too recently', () => {
    const late = buildCohort('C2', '2025-04-01');
    const data = buildOrganization([COHORT, late], [buildParticipant('X1', late, buildSessions('2025-04-01', FULL_SCHEDULE, 220, 200))]);
    expect(evaluateRecognition(STANDARD, data, SUBMISSION).evaluationCohortIds).toEqual([COHORT.entityId]);
  });
});

describe('recognition', () => {
  it('awards Full Plus when requirements 5, 6 and 7 and every retention checkpoint hold, with the counts behind each share', () => {
    const evaluation = evaluateRecognition(STANDARD, buildDefaultOrganization(), SUBMISSION);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.COMPLETERS)?.measured).toEqual({ value: 0.8, numerator: 8, denominator: 10 });
    expect(result(evaluation, DPRP_REQUIREMENT_ID.RISK_REDUCTION)?.measured).toEqual({ value: 0.75, numerator: 6, denominator: 8 });
    expect(evaluation.status).toBe(RECOGNITION_STATUS.FULL_PLUS);
  });

  it('awards Full, not Full Plus, when fewer than half are retained into month 4', () => {
    // Three of ten complete (30%); the other seven leave in month 2, so month 4 retention is 30%.
    const completers = Array.from({ length: 3 }, (_, index) => buildParticipant(`P${index + 1}`, COHORT, buildSessions(START, FULL_SCHEDULE, 220, 206.8)));
    const leavers = Array.from({ length: 7 }, (_, index) => buildParticipant(`L${index + 1}`, COHORT, buildSessions(START, [0, 7, 14, 21, 28, 35], 220, 218)));
    const evaluation = evaluateRecognition(STANDARD, buildOrganization([COHORT], [...completers, ...leavers]), SUBMISSION);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.RETENTION_MONTH_4)?.outcome).toBe(REQUIREMENT_OUTCOME.NOT_MET);
    expect(evaluation.status).toBe(RECOGNITION_STATUS.FULL);
  });

  it('does not calculate requirements 6 and 7 until requirement 5 is met', () => {
    const evaluation = evaluateRecognition(STANDARD, buildOrganization([COHORT], buildDefaultParticipants().slice(0, 4)), SUBMISSION);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.ELIGIBLE_PARTICIPANTS)?.outcome).toBe(REQUIREMENT_OUTCOME.NOT_MET);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.RISK_REDUCTION)?.outcome).toBe(REQUIREMENT_OUTCOME.NOT_EVALUATED);
    expect(evaluation.status).toBe(RECOGNITION_STATUS.PENDING);
  });

  it('needs 35% of completers eligible by blood test or gestational diabetes', () => {
    const riskTestOnly = buildDefaultParticipants(buildEnrollment({ ...NO_BLOOD_TEST, riskTestPositive: true }));
    const evaluation = evaluateRecognition(STANDARD, buildOrganization([COHORT], riskTestOnly), SUBMISSION);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.BLOOD_TEST_ELIGIBILITY)?.outcome).toBe(REQUIREMENT_OUTCOME.NOT_MET);
    expect(evaluation.status).toBe(RECOGNITION_STATUS.PRELIMINARY);
  });
});

describe('the standard is data', () => {
  it('names only metrics the registry can calculate, and the registry has nothing the standard leaves unused', () => {
    expect(validateRequirementDefinitions(STANDARD.requirements, STANDARD.tiers, DPRP_METRIC_REGISTRY)).toEqual([]);
    const named = new Set(STANDARD.requirements.map((requirement) => requirement.metric));
    expect(Object.values(METRIC_KEY).filter((key) => !named.has(key))).toEqual([]);
  });

  it('evaluates a different edition with no change to the engine', () => {
    // A hypothetical edition: 5% weight loss is the only outcome, and Requirement 6 needs 80% of completers.
    const strict: RecognitionStandardDefinition = {
      ...STANDARD,
      version: 'test-strict',
      outcomePathways: STANDARD.outcomePathways.filter((pathway) => pathway.pathway === OUTCOME_PATHWAY.WEIGHT_LOSS),
      requirements: STANDARD.requirements.map((requirement) => (requirement.id === DPRP_REQUIREMENT_ID.RISK_REDUCTION ? { ...requirement, threshold: 0.8 } : requirement)),
    };
    const data = buildDefaultOrganization();
    expect(evaluateRecognition(STANDARD, data, SUBMISSION).status).toBe(RECOGNITION_STATUS.FULL_PLUS);
    expect(evaluateRecognition(strict, data, SUBMISSION).status).toBe(RECOGNITION_STATUS.PRELIMINARY);
  });

  it("keeps the weight rule's range in step with the data dictionary", () => {
    const weightRule = STANDARD.rules.find((rule) => rule.check.kind === RULE_CHECK_KIND.RANGE && rule.check.field === SESSION_FIELD.WEIGHT_POUNDS);
    const element = DPRP_DATA_DICTIONARY_2024.find((candidate) => candidate.column === SUBMISSION_COLUMN.WEIGHT);
    expect(weightRule?.check.kind === RULE_CHECK_KIND.RANGE ? { min: weightRule.check.min, max: weightRule.check.max } : null).toEqual(element?.range);
  });
});

describe('submission file', () => {
  it('writes records in the DPRP columns and codes', () => {
    const data = buildOrganization([COHORT], [buildParticipant('P1', COHORT, buildSessions(START, [0, 200], 220, 210))]);
    const rows = resolveSubmissionRows(STANDARD, PROGRAM_CONFIGURATION, data, ORGANIZATION_ID, SUBMISSION);
    expect(rows.map((row) => [row[SUBMISSION_COLUMN.SESSION_TYPE], row[SUBMISSION_COLUMN.SESSION_DATE], row[SUBMISSION_COLUMN.WEIGHT]])).toEqual([
      [SESSION_TYPE_CODE.CORE, '01/06/2025', '220.0'],
      [SESSION_TYPE_CODE.CORE_MAINTENANCE, '07/25/2025', '210.0'],
    ]);
    expect(resolveSubmissionCsv(rows).split('\n')[0]).toBe(Object.values(SUBMISSION_COLUMN).join(','));
  });
});
