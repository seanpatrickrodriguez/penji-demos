import {
  CANONICAL_FORM,
  COHORT_KIND,
  COMPARATOR,
  DEFINITION_KIND,
  DERIVED_FACT,
  DPRP_ELIGIBILITY_BASIS,
  DPRP_REQUIREMENT_ID,
  ENROLLMENT_FIELD,
  METRIC_KEY,
  OUTCOME_PATHWAY,
  RECOGNITION_STATUS,
  RECORD_REVIEW,
  RESULT_SOURCE,
  RULE_CHECK_KIND,
  RULE_SCOPE,
  SESSION_FIELD,
  VALIDATION_SEVERITY,
} from '@penji-demos/constants';
import { Condition, CriterionDefinition, RecognitionStandardDefinition, RuleDefinition, SourceReference, toDefinitionId } from '@penji-demos/types';

// M1: the 2024 CDC Diabetes Prevention Recognition Program Standards and
// Operating Procedures, written as a RecognitionStandardDefinition.  Who is
// eligible, what a record must hold and how an organization is recognized are
// all data here, each with the section it comes from.  The platform's records
// and forms never take the DPRP's shape; it reaches them only through these
// criteria and rules.

const STANDARDS_URL = 'https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/dprp-standards.pdf';
const TITLE = '2024 CDC Diabetes Prevention Recognition Program Standards and Operating Procedures';
const section = (name: string): SourceReference => ({ title: TITLE, url: STANDARDS_URL, section: name });

const ELIGIBILITY = section('II.A Participant Eligibility');
const SESSION_DELIVERY = section('II.I Guidelines for Session Delivery');
const MAKE_UP_SESSIONS = section('II.J Make-up Sessions');
const REQUIREMENTS_SECTION = section('II.K Requirements for Pending, Preliminary, Full, and Full Plus Recognition');
const COHORTS = section('II.K Evaluations for Preliminary, Full, and Full Plus Recognition');
const DATA_ELEMENTS = section('IV Evaluation Data Elements and Table 5');

const E = ENROLLMENT_FIELD;
const F = DERIVED_FACT;
const S = SESSION_FIELD;
const R = DPRP_REQUIREMENT_ID;

const DAYS_IN_A_YEAR = 365;
const isTrue = (field: string): Condition => ({ kind: 'equals', field, value: true });
const isFalse = (field: string): Condition => ({ kind: 'equals', field, value: false });
const criterion = (id: string, label: string, condition: Condition, describes: readonly string[]): CriterionDefinition => ({ id, label, citation: ELIGIBILITY, condition, describes });

// A blood test result in the prediabetes range, tested within a year before enrollment.
const bloodTestInRange = (value: string, date: string, min: number, max: number): Condition => ({
  kind: 'all',
  conditions: [
    { kind: 'between', field: value, min, max },
    { kind: 'withinDaysBefore', field: date, anchor: E.ENROLLMENT_DATE, days: DAYS_IN_A_YEAR },
  ],
});

// Rules default to a blocking error that must be fixed; each states what differs.
const rule = (definition: Omit<RuleDefinition, 'appliesWhen' | 'severity' | 'blocks' | 'bypassable'> & Partial<Pick<RuleDefinition, 'appliesWhen' | 'severity' | 'blocks' | 'bypassable'>>): RuleDefinition => ({
  appliesWhen: null,
  severity: VALIDATION_SEVERITY.ERROR,
  blocks: true,
  bypassable: false,
  ...definition,
});

const SESSION_WEIGHT = { form: CANONICAL_FORM.SESSION, field: S.WEIGHT_POUNDS } as const;

const RULES: readonly RuleDefinition[] = [
  rule({
    id: 'dprp-weight-range',
    title: 'Weight within the recordable range',
    citation: DATA_ELEMENTS,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.RANGE, field: S.WEIGHT_POUNDS, min: 70, max: 997, unit: 'lb' },
    issue: 'Weight {value} lb is outside the recordable range of {expected}.',
    guidance: 'Re-weigh the participant or confirm the value.  If it cannot be confirmed, record no weight; the file reports 999.',
    fixTarget: SESSION_WEIGHT,
  }),
  rule({
    id: 'dprp-weight-outlier',
    title: 'Large weight changes confirmed',
    citation: SESSION_DELIVERY,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.CHANGE_AT_MOST, field: S.WEIGHT_POUNDS, percent: RECORD_REVIEW.WEIGHT_CHANGE_TO_CONFIRM_PERCENT },
    severity: VALIDATION_SEVERITY.WARNING,
    blocks: false,
    bypassable: true,
    issue: 'Weight changed {value} since the previous weighed session.',
    guidance: 'Confirm the weight with the participant.  A flagged weight that cannot be confirmed must be replaced with 999.',
    fixTarget: SESSION_WEIGHT,
  }),
  rule({
    id: 'dprp-same-date-weight',
    title: 'Make-up and regular sessions on one date record one weight',
    citation: MAKE_UP_SESSIONS,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.SAME_DATE_VALUES_MATCH, field: S.WEIGHT_POUNDS },
    issue: 'Two sessions on this date record different weights: {value}.',
    guidance: 'Record the weight measured that day on both sessions.',
    fixTarget: SESSION_WEIGHT,
  }),
  rule({
    id: 'dprp-one-regular-session-per-date',
    title: 'One regular session per date',
    citation: DATA_ELEMENTS,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.AT_MOST_PER_WINDOW, counts: isFalse(S.IS_MAKE_UP), max: 1, windowDays: 1 },
    issue: 'More than one regular session is recorded on this date.',
    guidance: 'Remove the duplicate, or mark the second session as a make-up.  Only one make-up may share a date with a regular session.',
    fixTarget: { form: CANONICAL_FORM.SESSION, field: S.IS_MAKE_UP },
  }),
  rule({
    id: 'dprp-one-make-up-per-week',
    title: 'One make-up session per week',
    citation: MAKE_UP_SESSIONS,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.AT_MOST_PER_WINDOW, counts: isTrue(S.IS_MAKE_UP), max: 1, windowDays: 7 },
    severity: VALIDATION_SEVERITY.WARNING,
    blocks: false,
    bypassable: true,
    issue: '{value} make-up sessions fall within one week.',
    guidance: 'Only one make-up session may be held per week.  Check the dates, or accept with a note if they are right.',
    fixTarget: { form: CANONICAL_FORM.SESSION, field: S.SESSION_DATE },
  }),
  rule({
    id: 'dprp-session-not-before-cohort',
    title: "Sessions on or after the cohort's first session",
    citation: COHORTS,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.NOT_BEFORE_ANCHOR, anchor: F.COHORT_START_DATE },
    issue: "This session is dated {value}, before the cohort's first session.",
    guidance: 'Correct the session date, or move the participant to the cohort they actually attended.',
    fixTarget: { form: CANONICAL_FORM.SESSION, field: S.SESSION_DATE },
  }),
  rule({
    id: 'dprp-session-within-program-year',
    title: 'Sessions within the program year',
    citation: section('II.K Requirement 3: Intervention duration'),
    scope: RULE_SCOPE.SESSION,
    check: {
      kind: RULE_CHECK_KIND.CONDITION,
      condition: { kind: 'withinDaysAfter', field: S.SESSION_DATE, anchor: F.COHORT_START_DATE, days: DAYS_IN_A_YEAR - 1 },
      describes: [S.SESSION_DATE, F.COHORT_START_DATE],
    },
    severity: VALIDATION_SEVERITY.INFO,
    blocks: false,
    bypassable: true,
    issue: 'This session falls after the first 365 days of the cohort and is not evaluated.',
    guidance: 'Nothing to fix: sessions after the program year stay on record and are left out of evaluations.',
    fixTarget: null,
  }),
  rule({
    id: 'dprp-activity-recorded',
    title: 'Activity minutes recorded at every session',
    citation: SESSION_DELIVERY,
    scope: RULE_SCOPE.SESSION,
    check: { kind: RULE_CHECK_KIND.REQUIRED, field: S.ACTIVITY_MINUTES },
    issue: 'No activity minutes are recorded for this session.',
    guidance: 'Record the minutes reported since the previous session, or 0 if the participant reported none.',
    fixTarget: { form: CANONICAL_FORM.SESSION, field: S.ACTIVITY_MINUTES },
  }),
  rule({
    id: 'dprp-group-join-window',
    title: 'Group participants start within 14 days of the cohort',
    citation: COHORTS,
    scope: RULE_SCOPE.PARTICIPANT,
    appliesWhen: { kind: 'equals', field: F.COHORT_KIND, value: COHORT_KIND.GROUP },
    check: { kind: RULE_CHECK_KIND.WITHIN_DAYS_OF_ANCHOR, field: F.FIRST_SESSION_DATE, anchor: F.COHORT_START_DATE, days: 14 },
    severity: VALIDATION_SEVERITY.WARNING,
    blocks: false,
    bypassable: true,
    issue: "The participant's first session was {value} days after the group's first session.",
    guidance: "The Standards encourage giving a participant who joins more than 14 days late their own cohort, using their participant ID as the cohort ID.",
    fixTarget: null,
  }),
  rule({
    id: 'dprp-height-recorded',
    title: 'Height recorded at enrollment',
    citation: DATA_ELEMENTS,
    scope: RULE_SCOPE.ENROLLMENT,
    check: { kind: RULE_CHECK_KIND.REQUIRED, field: E.HEIGHT_INCHES },
    issue: 'No height is recorded.',
    guidance: 'Ask the participant their height; it may be self-reported.',
    fixTarget: { form: CANONICAL_FORM.ENROLLMENT, field: E.HEIGHT_INCHES },
  }),
  rule({
    id: 'dprp-a1c-range',
    title: 'A1C within the recordable range',
    citation: DATA_ELEMENTS,
    scope: RULE_SCOPE.ENROLLMENT,
    check: { kind: RULE_CHECK_KIND.RANGE, field: E.A1C_PERCENT, min: 2.5, max: 18, unit: '%' },
    issue: 'A1C {value}% is outside the recordable range of {expected}.',
    guidance: 'Check the value against the lab report.',
    fixTarget: { form: CANONICAL_FORM.ENROLLMENT, field: E.A1C_PERCENT },
  }),
  ...[
    { value: E.A1C_PERCENT, date: E.A1C_TEST_DATE, name: 'A1C' },
    { value: E.FASTING_GLUCOSE_MG_DL, date: E.FASTING_GLUCOSE_TEST_DATE, name: 'fasting glucose' },
    { value: E.ORAL_GLUCOSE_TOLERANCE_MG_DL, date: E.ORAL_GLUCOSE_TOLERANCE_TEST_DATE, name: 'glucose tolerance' },
  ].map(({ value, date, name }) =>
    rule({
      id: `dprp-${date}-recorded`,
      title: `${name} test date recorded with the result`,
      citation: ELIGIBILITY,
      scope: RULE_SCOPE.ENROLLMENT,
      check: { kind: RULE_CHECK_KIND.REQUIRED_WHEN, field: date, when: { kind: 'answered', field: value } },
      issue: `A ${name} result is recorded without its test date.`,
      guidance: 'Record the test date: a blood test counts only within a year of enrollment.',
      fixTarget: { form: CANONICAL_FORM.ENROLLMENT, field: date },
    }),
  ),
  rule({
    id: 'dprp-mdpp-lab-results',
    title: 'Medicare participants provide lab results',
    citation: ELIGIBILITY,
    scope: RULE_SCOPE.ENROLLMENT,
    appliesWhen: { kind: 'all', conditions: [isTrue(E.MEDICARE_PART_B), { kind: 'answered', field: E.BLOOD_TEST_SOURCE }] },
    check: { kind: RULE_CHECK_KIND.CONDITION, condition: { kind: 'equals', field: E.BLOOD_TEST_SOURCE, value: RESULT_SOURCE.LAB }, describes: [E.BLOOD_TEST_SOURCE] },
    issue: 'This Medicare participant\'s blood test result is self-reported.',
    guidance: 'Participants in the Medicare Diabetes Prevention Program cannot self-report blood test results.  Attach the lab report.',
    fixTarget: { form: CANONICAL_FORM.ENROLLMENT, field: E.BLOOD_TEST_SOURCE },
  }),
];

export const DPRP_STANDARD_2024: RecognitionStandardDefinition = {
  kind: DEFINITION_KIND.STANDARD,
  id: toDefinitionId('cdc-dprp-standards'),
  version: '2024',
  edition: '2024',
  title: TITLE,
  shortName: 'DPRP 2024',
  source: { title: TITLE, url: STANDARDS_URL },
  appliesWhen: null,

  eligibility: {
    criteria: [
      criterion('dprp-age', 'Age 18 or older', { kind: 'atLeast', field: E.AGE_YEARS, value: 18 }, [E.AGE_YEARS]),
      criterion(
        'dprp-bmi',
        'BMI 25 or higher (23 if Asian or Asian American)',
        {
          kind: 'any',
          conditions: [
            { kind: 'all', conditions: [isFalse(E.IDENTIFIES_AS_ASIAN), { kind: 'atLeast', field: F.FIRST_SESSION_BMI, value: 25 }] },
            { kind: 'all', conditions: [isTrue(E.IDENTIFIES_AS_ASIAN), { kind: 'atLeast', field: F.FIRST_SESSION_BMI, value: 23 }] },
          ],
        },
        [F.FIRST_SESSION_BMI, E.IDENTIFIES_AS_ASIAN],
      ),
      criterion('dprp-no-diabetes', 'No type 1 or type 2 diabetes diagnosed before enrollment', isFalse(E.DIABETES_DIAGNOSED), [E.DIABETES_DIAGNOSED]),
      criterion('dprp-not-pregnant', 'Not pregnant at enrollment', isFalse(E.PREGNANT), [E.PREGNANT]),
      criterion('dprp-still-eligible', 'Not recoded ineligible for a type 2 diabetes diagnosis or a pregnancy', isFalse(F.RECODED_INELIGIBLE), [F.RECODED_INELIGIBLE]),
    ],
    basesLabel: 'Prediabetes by blood test, previous gestational diabetes or the risk test',
    bases: [
      criterion(
        DPRP_ELIGIBILITY_BASIS.BLOOD_TEST,
        'Blood test in the prediabetes range within a year of enrollment',
        {
          kind: 'any',
          conditions: [
            bloodTestInRange(E.FASTING_GLUCOSE_MG_DL, E.FASTING_GLUCOSE_TEST_DATE, 100, 125),
            bloodTestInRange(E.ORAL_GLUCOSE_TOLERANCE_MG_DL, E.ORAL_GLUCOSE_TOLERANCE_TEST_DATE, 140, 199),
            bloodTestInRange(E.A1C_PERCENT, E.A1C_TEST_DATE, 5.7, 6.4),
          ],
        },
        [E.A1C_PERCENT, E.FASTING_GLUCOSE_MG_DL, E.ORAL_GLUCOSE_TOLERANCE_MG_DL],
      ),
      criterion(DPRP_ELIGIBILITY_BASIS.GESTATIONAL_DIABETES, 'Gestational diabetes in a previous pregnancy', isTrue(E.GESTATIONAL_DIABETES_HISTORY), [E.GESTATIONAL_DIABETES_HISTORY]),
      criterion(DPRP_ELIGIBILITY_BASIS.RISK_TEST, 'Positive Prediabetes Risk Test', isTrue(E.RISK_TEST_POSITIVE), [E.RISK_TEST_POSITIVE]),
    ],
  },

  rules: RULES,

  program: {
    durationDays: 365,
    corePhaseMonths: 6,
    minimumCoreSessionsOffered: 16,
    minimumCoreMaintenanceSessionsOffered: 6,
  },

  completer: {
    minimumCorePhaseSessions: 8,
    minimumFullMonthsFirstSessionToLast: 9,
  },

  laboratoryBases: [DPRP_ELIGIBILITY_BASIS.BLOOD_TEST, DPRP_ELIGIBILITY_BASIS.GESTATIONAL_DIABETES],

  a1cOutcome: {
    initialRange: { min: 5.7, max: 6.4 },
    initialTestedWithinDaysBeforeFirstSession: DAYS_IN_A_YEAR,
    initialReportedWithinDaysOfFirstSession: 14,
    finalTestProgramMonths: { min: 9, max: 12 },
  },

  outcomePathways: [
    {
      pathway: OUTCOME_PATHWAY.WEIGHT_LOSS,
      label: '5% weight loss',
      minimumWeightLossPercent: 5,
      minimumWeeklyActivityMinutes: null,
      minimumActivitySessions: null,
      minimumSessionsAttended: null,
      minimumA1cReductionPoints: null,
    },
    {
      pathway: OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ACTIVITY,
      label: '4% weight loss and 150 minutes a week of activity over at least 8 sessions',
      minimumWeightLossPercent: 4,
      minimumWeeklyActivityMinutes: 150,
      minimumActivitySessions: 8,
      minimumSessionsAttended: null,
      minimumA1cReductionPoints: null,
    },
    {
      pathway: OUTCOME_PATHWAY.WEIGHT_LOSS_WITH_ATTENDANCE,
      label: '4% weight loss and at least 17 sessions attended',
      minimumWeightLossPercent: 4,
      minimumWeeklyActivityMinutes: null,
      minimumActivitySessions: null,
      minimumSessionsAttended: 17,
      minimumA1cReductionPoints: null,
    },
    {
      pathway: OUTCOME_PATHWAY.A1C_REDUCTION,
      label: '0.2 point reduction in A1C',
      minimumWeightLossPercent: null,
      minimumWeeklyActivityMinutes: null,
      minimumActivitySessions: null,
      minimumSessionsAttended: null,
      minimumA1cReductionPoints: 0.2,
    },
  ],

  evaluationCohort: {
    minimumMonthsBeforeSubmission: 12,
    maximumMonthsBeforeSubmission: 18,
  },

  retentionCheckpoints: [{ programMonth: 4 }, { programMonth: 7 }, { programMonth: 10 }],

  earlyPreliminary: {
    submissionSequences: [1, 2],
    minimumSessionsAttended: 8,
  },

  submissionIntervalMonths: 6,

  requirements: [
    {
      id: R.ELIGIBLE_PARTICIPANTS,
      label: 'At least 5 eligible participants in the evaluation cohort',
      metric: METRIC_KEY.ELIGIBLE_PARTICIPANTS,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 5,
      unit: 'count',
      evaluatedAfter: [],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.COMPLETERS,
      label: 'At least 30% of eligible participants are completers',
      metric: METRIC_KEY.COMPLETER_SHARE_OF_ELIGIBLE,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 0.3,
      unit: 'share',
      evaluatedAfter: [],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.RISK_REDUCTION,
      label: 'At least 60% of completers reduced their risk',
      metric: METRIC_KEY.RISK_REDUCTION_SHARE_OF_COMPLETERS,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 0.6,
      unit: 'share',
      evaluatedAfter: [R.ELIGIBLE_PARTICIPANTS, R.COMPLETERS],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.BLOOD_TEST_ELIGIBILITY,
      label: 'At least 35% of completers eligible by blood test or gestational diabetes',
      metric: METRIC_KEY.BLOOD_TEST_OR_GDM_SHARE_OF_COMPLETERS,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 0.35,
      unit: 'share',
      evaluatedAfter: [R.ELIGIBLE_PARTICIPANTS, R.COMPLETERS],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.RETENTION_MONTH_4,
      label: 'At least 50% of eligible participants retained at the start of month 4',
      metric: METRIC_KEY.RETAINED_SHARE_AT_MONTH_4,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 0.5,
      unit: 'share',
      evaluatedAfter: [],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.RETENTION_MONTH_7,
      label: 'At least 40% of eligible participants retained at the start of month 7',
      metric: METRIC_KEY.RETAINED_SHARE_AT_MONTH_7,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 0.4,
      unit: 'share',
      evaluatedAfter: [],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.RETENTION_MONTH_10,
      label: 'At least 30% of eligible participants retained at the start of month 10',
      metric: METRIC_KEY.RETAINED_SHARE_AT_MONTH_10,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 0.3,
      unit: 'share',
      evaluatedAfter: [],
      source: REQUIREMENTS_SECTION,
    },
    {
      id: R.EARLY_PRELIMINARY,
      label: 'At a Sequence 1 or 2 submission, at least 5 eligible participants attended at least 8 sessions',
      metric: METRIC_KEY.ELIGIBLE_WITH_MINIMUM_CORE_SESSIONS,
      comparator: COMPARATOR.AT_LEAST,
      threshold: 5,
      unit: 'count',
      evaluatedAfter: [],
      source: REQUIREMENTS_SECTION,
    },
  ],

  tiers: [
    {
      status: RECOGNITION_STATUS.FULL_PLUS,
      label: 'Full Plus',
      requires: [R.ELIGIBLE_PARTICIPANTS, R.COMPLETERS, R.RISK_REDUCTION, R.BLOOD_TEST_ELIGIBILITY, R.RETENTION_MONTH_4, R.RETENTION_MONTH_7, R.RETENTION_MONTH_10],
    },
    { status: RECOGNITION_STATUS.FULL, label: 'Full', requires: [R.ELIGIBLE_PARTICIPANTS, R.COMPLETERS, R.RISK_REDUCTION, R.BLOOD_TEST_ELIGIBILITY] },
    { status: RECOGNITION_STATUS.PRELIMINARY, label: 'Preliminary', requires: [R.ELIGIBLE_PARTICIPANTS, R.COMPLETERS] },
    { status: RECOGNITION_STATUS.PRELIMINARY, label: 'Preliminary (option 3)', requires: [R.EARLY_PRELIMINARY] },
    { status: RECOGNITION_STATUS.PENDING, label: 'Pending', requires: [] },
  ],

  interpretations: [
    {
      clause: 'Sessions "in months 1-6"',
      reading: "Sessions dated before the same day six months after the cohort's first session.",
    },
    {
      clause: '"The time from the first session held for their cohort to the last session attended by the participant is at least 9 full months"',
      reading: "The participant's last session within the program year falls on or after the same day nine months after the cohort's first session.",
    },
    {
      clause: '"Only the first 365 days of data from each participant cohort will be analyzed"',
      reading: "Sessions 365 or more days after the cohort's first session are kept in the record and left out of every calculation.",
    },
    {
      clause: '"Weight loss is calculated using the first and last recorded weights during the Core and Core Maintenance phases"',
      reading: 'The first and last sessions in the program year with a reported weight, make-up sessions included.  A session reported as 999 has no weight.',
    },
    {
      clause: '"At least 8 sessions associated with an average of 150 minutes/week of physical activity"',
      reading:
        "Each session's minutes are turned into a weekly rate over the days since the participant's previous session (seven days for the first).  The participant needs at least 8 sessions with minutes reported, and those sessions' weekly rates must average 150 or more.",
    },
    {
      clause: 'Body mass index of at least 25 (23 if Asian or Asian American)',
      reading: "Calculated from the height given at enrollment and the first weight recorded at a session, since an enrollment weight is self-reported.",
    },
    {
      clause: '"Retained ... at the beginning of the 4th month"',
      reading: "The participant attended a session on or after the first day of program month 4 (the same day three months after the cohort's first session) and within the program year.  Months 7 and 10 work the same way.",
    },
    {
      clause: 'The evaluation cohort: cohorts holding their first session "at least one year but not more than 18 months before the first day of the current submission due month"',
      reading: "Cohorts whose first session is on or after the first day of the due month minus 18 months and before the first day of the due month minus 12 months.",
    },
    {
      clause: 'Eligible participants',
      reading:
        'Eligible at enrollment (age, BMI, a basis for prediabetes, no prior diabetes diagnosis, not pregnant) and not later recoded as ineligible for a type 2 diabetes diagnosis or a pregnancy.',
    },
    {
      clause: 'The 0.2% A1C reduction',
      reading:
        'An initial A1C of 5.7 to 6.4, tested within a year before the first session attended and reported within 14 days after it, and a final A1C tested in program months 9 to 12 that is at least 0.2 points lower.',
    },
  ],
};
