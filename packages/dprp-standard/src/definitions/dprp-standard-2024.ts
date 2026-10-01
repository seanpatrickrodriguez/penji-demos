import { COMPARATOR, DEFINITION_KIND, DPRP_REQUIREMENT_ID, METRIC_KEY, OUTCOME_PATHWAY, RECOGNITION_STATUS } from '@penji-demos/constants';
import { SourceReference, StandardDefinition, toDefinitionId } from '@penji-demos/types';

// M1: the 2024 CDC Diabetes Prevention Recognition Program Standards and
// Operating Procedures, written as a StandardDefinition.  Every number the
// evaluation uses is here, with the section it comes from; the code that
// evaluates a participant or an organization reads them from this object.

const STANDARDS_URL = 'https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/dprp-standards.pdf';
const TITLE = '2024 CDC Diabetes Prevention Recognition Program Standards and Operating Procedures';
const section = (name: string): SourceReference => ({ title: TITLE, url: STANDARDS_URL, section: name });

const REQUIREMENTS_SECTION = section('II.K Requirements for Pending, Preliminary, Full, and Full Plus Recognition');

const R = DPRP_REQUIREMENT_ID;

export const DPRP_STANDARD_2024: StandardDefinition = {
  kind: DEFINITION_KIND.STANDARD,
  id: toDefinitionId('cdc-dprp-standards'),
  version: '2024',
  edition: '2024',
  title: TITLE,
  source: { title: TITLE, url: STANDARDS_URL },

  eligibility: {
    minimumAgeYears: 18,
    minimumBmi: 25,
    minimumBmiAsian: 23,
    fastingGlucoseMgDl: { min: 100, max: 125 },
    oralGlucoseToleranceMgDl: { min: 140, max: 199 },
    a1cPercent: { min: 5.7, max: 6.4 },
    bloodTestMaximumAgeDays: 365,
  },

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

  sessions: {
    groupJoinWindowDays: 14,
    makeUpSessionsPerWeek: 1,
  },

  a1cOutcome: {
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
