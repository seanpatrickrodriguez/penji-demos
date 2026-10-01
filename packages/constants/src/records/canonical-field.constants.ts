// The canonical fields of the platform's records.  Standards bind their data
// elements and rules to these names; the records never take a standard's shape.
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

// The program records' forms, by definition ID.
export const PROGRAM_FORM = {
  ENROLLMENT: 'enrollment',
  SESSION: 'session',
} as const;
