import { METRIC_KEY, OUTCOME_PATHWAY, RECOGNITION_STATUS, REQUIREMENT_OUTCOME, SESSION_TYPE_CODE, SUBMISSION_COLUMN, DPRP_REQUIREMENT_ID } from '@penji-demos/constants';
import { validateDefinition } from '@penji-demos/form-engine';
import { validateRequirementDefinitions } from '@penji-demos/rule-engine';
import { toPlainDate } from '@penji-demos/time';
import { StandardDefinition } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { resolveDataElement } from '../definitions/data-dictionary-2024';
import { DPRP_STANDARD_2024 } from '../definitions/dprp-standard-2024';
import { resolveSessionLogForm } from '../definitions/session-log-form';
import { resolveSubmissionCsv, resolveSubmissionRows } from '../submission/resolve-submission-rows';
import { FULL_SCHEDULE, buildCohort, buildEnrollment, buildOrganization, buildParticipant, buildSessions } from '../testing/build-records';
import { evaluateRecognition } from './evaluate-recognition';
import { DPRP_METRIC_REGISTRY } from './metric-registry';
import { resolveCohortWindow } from './resolve-evaluation-cohort';

const STANDARD = DPRP_STANDARD_2024;
const START = '2025-01-06';
const SUBMISSION = toPlainDate('2026-03-01');
const COHORT = buildCohort('C1', START);

// Ten eligible participants: six complete the year losing 6%, two complete without
// losing weight, two leave after month 2.  Completers 8/10, risk reduced 6/8.
function buildDefaultOrganization() {
  const completers = Array.from({ length: 6 }, (_, index) => buildParticipant(`P${index + 1}`, COHORT, buildSessions(START, FULL_SCHEDULE, 220, 206.8)));
  const steady = Array.from({ length: 2 }, (_, index) => buildParticipant(`S${index + 1}`, COHORT, buildSessions(START, FULL_SCHEDULE, 220, 219)));
  const leavers = Array.from({ length: 2 }, (_, index) => buildParticipant(`L${index + 1}`, COHORT, buildSessions(START, [0, 7, 14, 21, 28, 35], 220, 218)));
  return buildOrganization([COHORT], [...completers, ...steady, ...leavers]);
}

const result = (evaluation: ReturnType<typeof evaluateRecognition>, id: string) => evaluation.requirements.find((entry) => entry.requirement.id === id);

describe('evaluation cohort', () => {
  it('looks at cohorts that began 12 to 18 months before the submission month', () => {
    expect(resolveCohortWindow(STANDARD, toPlainDate('2026-03-15'))).toEqual({ firstSessionOnOrAfter: '2024-09-01', firstSessionBefore: '2025-03-01' });
  });

  it('leaves out a cohort that began too recently', () => {
    const late = buildCohort('C2', '2025-04-01');
    const data = buildOrganization([COHORT, late], [buildParticipant('X1', late, buildSessions('2025-04-01', FULL_SCHEDULE, 220, 200))]);
    expect(evaluateRecognition(STANDARD, data, SUBMISSION).evaluationCohortIds).toEqual([COHORT.cohortId]);
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
    const data = buildDefaultOrganization();
    const evaluation = evaluateRecognition(STANDARD, { ...data, participants: data.participants.slice(0, 4) }, SUBMISSION);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.ELIGIBLE_PARTICIPANTS)?.outcome).toBe(REQUIREMENT_OUTCOME.NOT_MET);
    expect(result(evaluation, DPRP_REQUIREMENT_ID.RISK_REDUCTION)?.outcome).toBe(REQUIREMENT_OUTCOME.NOT_EVALUATED);
    expect(evaluation.status).toBe(RECOGNITION_STATUS.PENDING);
  });

  it('needs 35% of completers eligible by blood test or gestational diabetes', () => {
    const data = buildDefaultOrganization();
    const riskTestOnly = data.participants.map((participant) => ({ ...participant, enrollment: buildEnrollment({ prediabetesByBloodTest: false, prediabetesByRiskTest: true }) }));
    const evaluation = evaluateRecognition(STANDARD, { ...data, participants: riskTestOnly }, SUBMISSION);
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
    const strict: StandardDefinition = {
      ...STANDARD,
      version: 'test-strict',
      outcomePathways: STANDARD.outcomePathways.filter((pathway) => pathway.pathway === OUTCOME_PATHWAY.WEIGHT_LOSS),
      requirements: STANDARD.requirements.map((requirement) => (requirement.id === DPRP_REQUIREMENT_ID.RISK_REDUCTION ? { ...requirement, threshold: 0.8 } : requirement)),
    };
    const data = buildDefaultOrganization();
    expect(evaluateRecognition(STANDARD, data, SUBMISSION).status).toBe(RECOGNITION_STATUS.FULL_PLUS);
    expect(evaluateRecognition(strict, data, SUBMISSION).status).toBe(RECOGNITION_STATUS.PRELIMINARY);
  });

  it('resolves the session form from the data dictionary', () => {
    const form = resolveSessionLogForm();
    const weight = form.fields.find((field) => field.key === 'weightPounds');
    expect(validateDefinition(form)).toEqual([]);
    expect(weight?.kind === 'number' ? [weight.min, weight.max] : null).toEqual([resolveDataElement(SUBMISSION_COLUMN.WEIGHT).range?.min, resolveDataElement(SUBMISSION_COLUMN.WEIGHT).range?.max]);
  });
});

describe('submission file', () => {
  it('writes records in the DPRP columns and codes', () => {
    const data = buildOrganization([COHORT], [buildParticipant('P1', COHORT, buildSessions(START, [0, 200], 220, 210))]);
    const rows = resolveSubmissionRows(STANDARD, data);
    expect(rows.map((row) => [row[SUBMISSION_COLUMN.SESSION_TYPE], row[SUBMISSION_COLUMN.SESSION_DATE], row[SUBMISSION_COLUMN.WEIGHT]])).toEqual([
      [SESSION_TYPE_CODE.CORE, '01/06/2025', '220.0'],
      [SESSION_TYPE_CODE.CORE_MAINTENANCE, '07/25/2025', '210.0'],
    ]);
    expect(resolveSubmissionCsv(rows).split('\n')[0]).toBe(Object.values(SUBMISSION_COLUMN).join(','));
  });
});
