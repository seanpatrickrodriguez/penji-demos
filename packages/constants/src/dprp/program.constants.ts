// The recognition statuses the DPRP awards, lowest to highest.
export const RECOGNITION_STATUS = {
  PENDING: 'pending',
  PRELIMINARY: 'preliminary',
  FULL: 'full',
  FULL_PLUS: 'fullPlus',
} as const;

// The ways a completer can show reduced risk of type 2 diabetes (Requirement 6).
export const OUTCOME_PATHWAY = {
  WEIGHT_LOSS: 'weightLoss',
  WEIGHT_LOSS_WITH_ACTIVITY: 'weightLossWithActivity',
  WEIGHT_LOSS_WITH_ATTENDANCE: 'weightLossWithAttendance',
  A1C_REDUCTION: 'a1cReduction',
} as const;

// The bases on which a participant can be found to have prediabetes.
export const PREDIABETES_BASIS = {
  BLOOD_TEST: 'bloodTest',
  GESTATIONAL_DIABETES: 'gestationalDiabetes',
  RISK_TEST: 'riskTest',
} as const;

// The program phases a session can fall in, counted from the cohort's first session.
export const PROGRAM_PHASE = {
  CORE: 'core',
  CORE_MAINTENANCE: 'coreMaintenance',
  AFTER_PROGRAM_YEAR: 'afterProgramYear',
} as const;

// How a session was delivered, stored readable and coded as DMODE on export.
export const DELIVERY_MODE = {
  IN_PERSON: 'inPerson',
  ONLINE: 'online',
  DISTANCE_LEARNING: 'distanceLearning',
} as const;

// Why an enrolled participant stopped being eligible for evaluation.
export const INELIGIBILITY_EVENT = {
  TYPE_2_DIABETES: 'type2Diabetes',
  PREGNANCY: 'pregnancy',
} as const;

// The requirements of the DPRP Standards, by the numbers the document gives them.
export const DPRP_REQUIREMENT_ID = {
  ELIGIBLE_PARTICIPANTS: 'requirement-5a',
  COMPLETERS: 'requirement-5b',
  RISK_REDUCTION: 'requirement-6',
  BLOOD_TEST_ELIGIBILITY: 'requirement-7',
  RETENTION_MONTH_4: 'retention-month-4',
  RETENTION_MONTH_7: 'retention-month-7',
  RETENTION_MONTH_10: 'retention-month-10',
  EARLY_PRELIMINARY: 'preliminary-option-3',
} as const;

// The DPRP's ways of qualifying as having prediabetes, by eligibility basis ID.
export const DPRP_ELIGIBILITY_BASIS = {
  BLOOD_TEST: 'dprp-blood-test',
  GESTATIONAL_DIABETES: 'dprp-gestational-diabetes',
  RISK_TEST: 'dprp-risk-test',
} as const;

// The MDPP's ways of qualifying, by eligibility basis ID.
export const MDPP_ELIGIBILITY_BASIS = {
  A1C: 'mdpp-a1c',
  FASTING_GLUCOSE: 'mdpp-fasting-glucose',
  ORAL_GLUCOSE_TOLERANCE: 'mdpp-oral-glucose-tolerance',
} as const;
