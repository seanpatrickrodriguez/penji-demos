// The canonical fields of a diabetes prevention program's records on the
// platform.  Standards bind their data elements and rules to these names; the
// records never take a standard's shape.

// The levels of the program's tenant tree: a hub that oversees organizations.
export const PROGRAM_TENANT_KIND = {
  HUB: 'hub',
  ORGANIZATION: 'organization',
} as const;

// What an organization keeps on file: cohorts, and participants under them.
export const PROGRAM_ENTITY = {
  COHORT: 'cohort',
  PARTICIPANT: 'participant',
} as const;

export const HUB_FIELD = {
  REGION: 'hubRegion',
} as const;

export const ORGANIZATION_FIELD = {
  CODE: 'organizationCode',
  DELIVERY_MODE: 'organizationDeliveryMode',
  EFFECTIVE_DATE: 'effectiveDate',
} as const;

export const STAFF_FIELD = {
  POSITION: 'staffPosition',
} as const;

// A staff member's position, which gives their roles.
export const STAFF_POSITION = {
  DATA_SPECIALIST: 'dataSpecialist',
  LIFESTYLE_COACH: 'lifestyleCoach',
} as const;

export const COHORT_FIELD = {
  CODE: 'cohortCode',
  KIND: 'cohortKind',
  START_DATE: 'cohortStartDate',
} as const;

export const PARTICIPANT_FIELD = {
  CODE: 'participantCode',
  COACH_CODE: 'coachCode',
} as const;

export const ENROLLMENT_FIELD = {
  ENROLLMENT_DATE: 'enrollmentDate',
  AGE_YEARS: 'ageYears',
  HEIGHT_INCHES: 'heightInches',
  IDENTIFIES_AS_ASIAN: 'identifiesAsAsian',
  A1C_PERCENT: 'a1cPercent',
  A1C_TEST_DATE: 'a1cTestDate',
  A1C_REPORTED_DATE: 'a1cReportedDate',
  FASTING_GLUCOSE_MG_DL: 'fastingGlucoseMgDl',
  FASTING_GLUCOSE_TEST_DATE: 'fastingGlucoseTestDate',
  ORAL_GLUCOSE_TOLERANCE_MG_DL: 'oralGlucoseToleranceMgDl',
  ORAL_GLUCOSE_TOLERANCE_TEST_DATE: 'oralGlucoseToleranceTestDate',
  BLOOD_TEST_SOURCE: 'bloodTestSource',
  GESTATIONAL_DIABETES_HISTORY: 'gestationalDiabetesHistory',
  RISK_TEST_POSITIVE: 'riskTestPositive',
  DIABETES_DIAGNOSED: 'diabetesDiagnosed',
  PREGNANT: 'pregnant',
  MEDICARE_PART_B: 'medicarePartB',
  END_STAGE_RENAL_DISEASE: 'endStageRenalDisease',
  PRIOR_MDPP: 'priorMdpp',
} as const;

// Facts worked out from a participant's records rather than entered, available
// to conditions and rules alongside the enrollment fields.
export const DERIVED_FACT = {
  COHORT_START_DATE: 'cohortStartDate',
  COHORT_KIND: 'cohortKind',
  FIRST_SESSION_DATE: 'firstSessionDate',
  FIRST_SESSION_WEIGHT: 'firstSessionWeight',
  FIRST_SESSION_BMI: 'firstSessionBmi',
  RECODED_INELIGIBLE: 'recodedIneligible',
} as const;

// How a cohort runs: participants together, or one participant on their own timeline.
export const COHORT_KIND = {
  GROUP: 'group',
  INDIVIDUAL: 'individual',
} as const;

export const SESSION_FIELD = {
  SESSION_DATE: 'sessionDate',
  IS_MAKE_UP: 'isMakeUp',
  DELIVERY_MODE: 'deliveryMode',
  WEIGHT_REPORTED: 'weightReported',
  WEIGHT_POUNDS: 'weightPounds',
  ACTIVITY_MINUTES: 'activityMinutes',
} as const;

// Who reported a blood test result.
export const RESULT_SOURCE = {
  LAB: 'lab',
  SELF_REPORTED: 'selfReported',
} as const;

// An A1C result recorded after enrollment, such as the final test for the A1C outcome.
export const A1C_RESULT_FIELD = {
  PERCENT: 'resultA1cPercent',
  TEST_DATE: 'resultA1cTestDate',
  REPORTED_DATE: 'resultA1cReportedDate',
} as const;

// A participant recoded as no longer eligible during the program.
export const RECODE_FIELD = {
  EVENT: 'ineligibilityEvent',
  DATE: 'recodedDate',
} as const;

// The program's forms, by definition ID.
export const PROGRAM_FORM = {
  HUB: 'hub',
  ORGANIZATION: 'organization',
  STAFF: 'staff',
  COHORT: 'cohort',
  ENROLLMENT: 'enrollment',
  SESSION: 'session',
  A1C_RESULT: 'a1cResult',
  RECODE: 'recode',
} as const;

export const PROGRAM_PERMISSION = {
  EDIT_COHORT: 'editCohort',
  EDIT_ENROLLMENT: 'editEnrollment',
  RECORD_SESSION: 'recordSession',
  RECORD_RESULT: 'recordResult',
} as const;

export const PROGRAM_ROLE = {
  DATA_SPECIALIST: 'dataSpecialist',
  COACH: 'coach',
} as const;

// The program's streams of dated entries on a participant.
export const PROGRAM_STREAM = {
  SESSION: 'sessions',
  A1C_RESULT: 'a1cResults',
  RECODE: 'recodes',
} as const;
