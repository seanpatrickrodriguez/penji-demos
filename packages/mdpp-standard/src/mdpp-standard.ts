import { CANONICAL_FORM, DEFINITION_KIND, DERIVED_FACT, ENROLLMENT_FIELD, MDPP_ELIGIBILITY_BASIS, RESULT_SOURCE, RULE_CHECK_KIND, RULE_SCOPE, VALIDATION_SEVERITY } from '@penji-demos/constants';
import { ComplianceStandardDefinition, Condition, CriterionDefinition, SourceReference, toDefinitionId } from '@penji-demos/types';

// M1: Medicare Diabetes Prevention Program beneficiary eligibility, 42 CFR
// 410.79(c)(1), written as a ComplianceStandardDefinition.  It applies only to
// participants enrolled in Medicare Part B, reads the same enrollment facts as
// the DPRP, and reaches the forms through the same kind of rules.  No code
// changed to add it.

const URL = 'https://www.law.cornell.edu/cfr/text/42/410.79';
const TITLE = '42 CFR 410.79, Medicare Diabetes Prevention Program';
const paragraph = (number: string): SourceReference => ({ title: TITLE, url: URL, section: `410.79${number}` });

const E = ENROLLMENT_FIELD;
const F = DERIVED_FACT;

const DAYS_IN_A_YEAR = 365;
const isTrue = (field: string): Condition => ({ kind: 'equals', field, value: true });
const isFalse = (field: string): Condition => ({ kind: 'equals', field, value: false });
const criterion = (id: string, label: string, number: string, condition: Condition, describes: readonly string[]): CriterionDefinition => ({
  id,
  label,
  citation: paragraph(number),
  condition,
  describes,
});

// A lab result in range, tested within the 12 months before the first core session.
const labResultInRange = (value: string, date: string, min: number, max: number): Condition => ({
  kind: 'all',
  conditions: [
    { kind: 'between', field: value, min, max },
    { kind: 'withinDaysBefore', field: date, anchor: F.FIRST_SESSION_DATE, days: DAYS_IN_A_YEAR },
    { kind: 'equals', field: E.BLOOD_TEST_SOURCE, value: RESULT_SOURCE.LAB },
  ],
});

export const MDPP_STANDARD: ComplianceStandardDefinition = {
  kind: DEFINITION_KIND.STANDARD,
  id: toDefinitionId('cms-mdpp-eligibility'),
  version: '42 CFR 410.79',
  title: TITLE,
  shortName: 'MDPP',
  source: { title: TITLE, url: URL },
  appliesWhen: isTrue(E.MEDICARE_PART_B),

  eligibility: {
    criteria: [
      criterion(
        'mdpp-bmi',
        'BMI 25 or higher at the first core session (23 if Asian)',
        '(c)(1)(i)(C)',
        {
          kind: 'any',
          conditions: [
            { kind: 'all', conditions: [isFalse(E.IDENTIFIES_AS_ASIAN), { kind: 'atLeast', field: F.FIRST_SESSION_BMI, value: 25 }] },
            { kind: 'all', conditions: [isTrue(E.IDENTIFIES_AS_ASIAN), { kind: 'atLeast', field: F.FIRST_SESSION_BMI, value: 23 }] },
          ],
        },
        [F.FIRST_SESSION_BMI, E.IDENTIFIES_AS_ASIAN],
      ),
      criterion('mdpp-no-diabetes', 'No previous diagnosis of diabetes other than gestational diabetes', '(c)(1)(i)(E)', isFalse(E.DIABETES_DIAGNOSED), [E.DIABETES_DIAGNOSED]),
      criterion('mdpp-no-esrd', 'No end-stage renal disease', '(c)(1)(i)(F)', isFalse(E.END_STAGE_RENAL_DISEASE), [E.END_STAGE_RENAL_DISEASE]),
      criterion('mdpp-first-time', 'Has not received the MDPP set of services before', '(c)(1)(i)(B)', isFalse(E.PRIOR_MDPP), [E.PRIOR_MDPP]),
    ],
    basesLabel: 'A lab blood test in range within 12 months before the first core session',
    bases: [
      criterion(MDPP_ELIGIBILITY_BASIS.A1C, 'A1C 5.7 to 6.4%', '(c)(1)(i)(D)', labResultInRange(E.A1C_PERCENT, E.A1C_TEST_DATE, 5.7, 6.4), [E.A1C_PERCENT, E.BLOOD_TEST_SOURCE]),
      criterion(
        MDPP_ELIGIBILITY_BASIS.FASTING_GLUCOSE,
        'Fasting plasma glucose 110 to 125 mg/dL',
        '(c)(1)(i)(D)',
        labResultInRange(E.FASTING_GLUCOSE_MG_DL, E.FASTING_GLUCOSE_TEST_DATE, 110, 125),
        [E.FASTING_GLUCOSE_MG_DL, E.BLOOD_TEST_SOURCE],
      ),
      criterion(
        MDPP_ELIGIBILITY_BASIS.ORAL_GLUCOSE_TOLERANCE,
        '2-hour plasma glucose 140 to 199 mg/dL',
        '(c)(1)(i)(D)',
        labResultInRange(E.ORAL_GLUCOSE_TOLERANCE_MG_DL, E.ORAL_GLUCOSE_TOLERANCE_TEST_DATE, 140, 199),
        [E.ORAL_GLUCOSE_TOLERANCE_MG_DL, E.BLOOD_TEST_SOURCE],
      ),
    ],
  },

  rules: [
    {
      id: 'mdpp-blood-test-source',
      title: 'Blood test source recorded for Medicare participants',
      citation: paragraph('(c)(1)(i)(D)'),
      scope: RULE_SCOPE.ENROLLMENT,
      appliesWhen: null,
      check: { kind: RULE_CHECK_KIND.REQUIRED, field: E.BLOOD_TEST_SOURCE },
      severity: VALIDATION_SEVERITY.ERROR,
      blocks: true,
      bypassable: false,
      issue: 'No blood test source is recorded for this Medicare participant.',
      guidance: 'Record a blood test result and attach the lab report; MDPP eligibility needs a lab result from the 12 months before the first core session.',
      fixTarget: { form: CANONICAL_FORM.ENROLLMENT, field: E.BLOOD_TEST_SOURCE },
    },
  ],

  interpretations: [
    {
      clause: '"A body mass index ... on the date of attendance at the first core session"',
      reading: 'Calculated from the enrollment height and the weight recorded at the first session attended.',
    },
    {
      clause: 'The blood test "within the 12-month time period prior to the date of attendance at the first core session"',
      reading: 'A lab result dated within 365 days before the first session attended.  A self-reported result does not count.',
    },
  ],
};
