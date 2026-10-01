// Codes from Table 5, Data Dictionary: Evaluation Data Elements, of the 2024
// CDC DPRP Standards.  Records store readable values; these codes appear only
// where data crosses into the DPRP's format (the submission file).

export const SESSION_TYPE_CODE = {
  CORE: 'C',
  CORE_MAINTENANCE: 'CM',
  ONGOING_MAINTENANCE: 'OM',
  MAKE_UP_CORE: 'MU-C',
  MAKE_UP_CORE_MAINTENANCE: 'MU-CM',
  MAKE_UP_ONGOING_MAINTENANCE: 'MU-OM',
} as const;

export const DELIVERY_MODE_CODE = {
  IN_PERSON: 1,
  ONLINE: 2,
  DISTANCE_LEARNING: 3,
} as const;

// GLUCTEST, GDM and RISKTEST share one coding: 1 determined, 2 not determined.
export const PREDIABETES_DETERMINATION_CODE = {
  DETERMINED: 1,
  NOT_DETERMINED: 2,
} as const;

// Sentinels the dictionary uses for a value that was not reported.
export const NOT_REPORTED = {
  WEIGHT: 999,
  A1C: 999,
} as const;

// The submission file's columns for the session-level elements this demo exports, in dictionary order.
export const SUBMISSION_COLUMN = {
  ORGANIZATION_CODE: 'ORGCODE',
  PARTICIPANT_ID: 'PARTICIPANTID',
  COHORT_ID: 'COHORTID',
  COACH_ID: 'COACHID',
  AGE: 'AGE',
  HEIGHT: 'HEIGHT',
  A1C: 'A1C',
  GLUCTEST: 'GLUCTEST',
  GDM: 'GDM',
  RISKTEST: 'RISKTEST',
  DELIVERY_MODE: 'DMODE',
  SESSION_TYPE: 'SESSTYPE',
  SESSION_DATE: 'DATE',
  WEIGHT: 'WEIGHT',
  PHYSICAL_ACTIVITY: 'PA',
} as const;
