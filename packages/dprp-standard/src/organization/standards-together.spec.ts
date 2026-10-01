import { ENROLLMENT_FIELD, RESULT_SOURCE, RULE_SCOPE, SESSION_FIELD } from '@penji-demos/constants';
import { resolveConstrainedForm, resolveFieldConstraints } from '@penji-demos/compliance-engine';
import { MDPP_STANDARD } from '@penji-demos/mdpp-standard';
import { ENROLLMENT_FORM, SESSION_FORM } from '@penji-demos/program-records';
import { toPlainDate } from '@penji-demos/time';
import { Enrollment } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { DPRP_STANDARD_2024 } from '../definitions/dprp-standard-2024';
import { evaluateParticipant } from '../participant/evaluate-participant';
import { buildCohort, buildEnrollment, buildParticipant, buildSessions } from '../testing/build-records';

// Two standards on the same records: the DPRP for every participant, and the
// MDPP for those enrolled in Medicare Part B.  Neither changes the records,
// the forms or the engine; each reaches them through its own definitions.

const COHORT = buildCohort('C1', '2025-01-06');
const SESSIONS = buildSessions('2025-01-06', [0, 7, 14], 210, 208);
const MEDICARE: Partial<Enrollment> = { medicarePartB: true, ageYears: 67 };

const evaluate = (overrides: Partial<Enrollment>) => {
  const evaluation = evaluateParticipant(DPRP_STANDARD_2024, buildParticipant('P1', COHORT, SESSIONS, { enrollment: buildEnrollment(overrides) }), COHORT, [MDPP_STANDARD]);
  const [dprp, mdpp] = evaluation.standards;
  if (!dprp || !mdpp) throw new Error('Both standards should be evaluated.');
  return { dprp, mdpp };
};

describe('the DPRP and the MDPP on the same participant', () => {
  it('reads one fasting glucose of 105 as prediabetes for the DPRP and not for the MDPP', () => {
    const { dprp, mdpp } = evaluate({ ...MEDICARE, fastingGlucoseMgDl: 105 });
    expect(dprp.eligibility?.met).toBe(true);
    expect(mdpp.eligibility?.met).toBe(false);
  });

  it('accepts a positive risk test for the DPRP only', () => {
    const { dprp, mdpp } = evaluate({ ...MEDICARE, fastingGlucoseMgDl: null, fastingGlucoseTestDate: null, bloodTestSource: null, riskTestPositive: true });
    expect(dprp.eligibility?.met).toBe(true);
    expect(mdpp.eligibility?.met).toBe(false);
    expect(mdpp.findings.map((finding) => finding.ruleId)).toEqual(['mdpp-blood-test-source']);
  });

  it("raises the DPRP's own rule against a self-reported result once the participant is on Medicare", () => {
    const selfReported = { bloodTestSource: RESULT_SOURCE.SELF_REPORTED };
    expect(evaluate(selfReported).dprp.findings.map((finding) => finding.ruleId)).toEqual([]);
    expect(evaluate({ ...MEDICARE, ...selfReported }).dprp.findings.map((finding) => finding.ruleId)).toEqual(['dprp-mdpp-lab-results']);
  });

  it('leaves the MDPP out for participants without Medicare Part B', () => {
    const { mdpp } = evaluate({});
    expect(mdpp.applies).toBe(false);
    expect(mdpp.findings).toEqual([]);
  });

  it('measures the DPRP blood test window from enrollment and the MDPP window from the first core session', () => {
    // Tested 2024-01-04: 364 days before the 2025-01-02 enrollment, 368 before the 2025-01-06 first session.
    const { dprp, mdpp } = evaluate({ ...MEDICARE, fastingGlucoseMgDl: 115, fastingGlucoseTestDate: toPlainDate('2024-01-04') });
    expect([dprp.eligibility?.met, mdpp.eligibility?.met]).toEqual([true, false]);
  });
});

describe('rules delivered to the canonical forms', () => {
  const facts = (overrides: Partial<Enrollment>) => ({ ...buildEnrollment(overrides) });

  it("puts the DPRP's weight range and required activity minutes on the session form", () => {
    const constraints = resolveFieldConstraints(SESSION_FORM, RULE_SCOPE.EVENT, [DPRP_STANDARD_2024, MDPP_STANDARD], facts({}));
    const weight = constraints.find((constraint) => constraint.field === SESSION_FIELD.WEIGHT_POUNDS);
    expect(weight).toMatchObject({ min: 70, max: 997 });
    expect(weight?.sources.map((source) => source.standardShortName)).toEqual(['DPRP 2024']);
    const form = resolveConstrainedForm(SESSION_FORM, constraints);
    expect(form.fields.find((field) => field.key === SESSION_FIELD.ACTIVITY_MINUTES)).toMatchObject({ required: true });
  });

  it('makes the blood test source required on the enrollment form only for Medicare participants, citing the MDPP', () => {
    const withMedicare = resolveFieldConstraints(ENROLLMENT_FORM, RULE_SCOPE.SUBJECT, [DPRP_STANDARD_2024, MDPP_STANDARD], facts(MEDICARE));
    const without = resolveFieldConstraints(ENROLLMENT_FORM, RULE_SCOPE.SUBJECT, [DPRP_STANDARD_2024, MDPP_STANDARD], facts({}));
    const source = (list: typeof withMedicare) => list.find((constraint) => constraint.field === ENROLLMENT_FIELD.BLOOD_TEST_SOURCE);
    expect(source(withMedicare)).toMatchObject({ required: true });
    expect(source(withMedicare)?.sources[0]?.citation.section).toBe('410.79(c)(1)(i)(D)');
    expect(source(without)).toBeUndefined();
  });
});
