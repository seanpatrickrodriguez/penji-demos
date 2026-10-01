import { DEFINITION_KIND, DELIVERY_MODE_CODE, NOT_REPORTED, PREDIABETES_DETERMINATION_CODE, SESSION_TYPE_CODE, SUBMISSION_COLUMN } from '@penji-demos/constants';
import { CodedValue, DataElementDefinition, SourceReference, toDefinitionId } from '@penji-demos/types';

// M1: the session-level elements of Table 5, Data Dictionary: Evaluation Data
// Elements, that this demo models.  The submission file and the session form
// are both resolved from these definitions.

const TABLE_5: SourceReference = {
  title: '2024 CDC Diabetes Prevention Recognition Program Standards and Operating Procedures',
  url: 'https://www.cdc.gov/diabetes-prevention/media/pdfs/legacy/dprp-standards.pdf',
  section: 'IV, Table 5. Data Dictionary: Evaluation Data Elements',
};

const PREDIABETES_CODES = (basis: string): readonly CodedValue[] => [
  { code: PREDIABETES_DETERMINATION_CODE.DETERMINED, meaning: `Prediabetes determined by ${basis}` },
  { code: PREDIABETES_DETERMINATION_CODE.NOT_DETERMINED, meaning: `Prediabetes not determined by ${basis}` },
];

const element = (column: string, title: string, description: string, details: Partial<Pick<DataElementDefinition, 'codes' | 'range' | 'notReported' | 'unit'>> = {}): DataElementDefinition => ({
  kind: DEFINITION_KIND.DATA_ELEMENT,
  id: toDefinitionId(`dprp-2024-${column.toLowerCase()}`),
  version: '2024',
  title,
  source: TABLE_5,
  column,
  description,
  codes: details.codes ?? [],
  range: details.range ?? null,
  notReported: details.notReported ?? null,
  unit: details.unit ?? null,
});

export const DPRP_DATA_DICTIONARY_2024: readonly DataElementDefinition[] = [
  element(SUBMISSION_COLUMN.ORGANIZATION_CODE, 'Organization code', 'Assigned by the DPRP; one per delivery mode.'),
  element(SUBMISSION_COLUMN.PARTICIPANT_ID, 'Participant ID', 'Assigned by the organization; never based on PII and never reused.'),
  element(SUBMISSION_COLUMN.COHORT_ID, 'Cohort ID', 'Equal to the participant ID for an individual cohort.'),
  element(SUBMISSION_COLUMN.COACH_ID, 'Coach ID', 'Assigned by the organization; never based on PII.'),
  element(SUBMISSION_COLUMN.AGE, "Participant's age", 'Recorded at enrollment.', { range: { min: 18, max: 125 }, unit: 'years' }),
  element(SUBMISSION_COLUMN.HEIGHT, "Participant's height", 'Recorded at enrollment, to the nearest whole inch.', { range: { min: 30, max: 98 }, unit: 'inches' }),
  element(SUBMISSION_COLUMN.A1C, "Participant's reported A1C value", 'Initial entry 5.7 to 6.4; other entries 2.5 to 18.', { range: { min: 2.5, max: 18 }, notReported: NOT_REPORTED.A1C, unit: 'percent' }),
  element(SUBMISSION_COLUMN.GLUCTEST, 'Prediabetes determination (1 of 3)', 'By an acceptable blood test result.', { codes: PREDIABETES_CODES('an acceptable blood test result') }),
  element(SUBMISSION_COLUMN.GDM, 'Prediabetes determination (2 of 3)', 'By a clinical diagnosis of gestational diabetes during a previous pregnancy.', { codes: PREDIABETES_CODES('a previous diagnosis of gestational diabetes') }),
  element(SUBMISSION_COLUMN.RISKTEST, 'Prediabetes determination (3 of 3)', 'By the ADA/CDC Prediabetes Risk Test.', { codes: PREDIABETES_CODES('the ADA/CDC Prediabetes Risk Test') }),
  element(SUBMISSION_COLUMN.DELIVERY_MODE, 'Delivery mode', 'How this session was delivered.', {
    codes: [
      { code: DELIVERY_MODE_CODE.IN_PERSON, meaning: 'In person' },
      { code: DELIVERY_MODE_CODE.ONLINE, meaning: 'Online' },
      { code: DELIVERY_MODE_CODE.DISTANCE_LEARNING, meaning: 'Distance learning' },
    ],
  }),
  element(SUBMISSION_COLUMN.SESSION_TYPE, 'Session type', 'Set by when the session falls: months 1-6 are Core, months 7-12 Core Maintenance.', {
    codes: [
      { code: SESSION_TYPE_CODE.CORE, meaning: 'Core session' },
      { code: SESSION_TYPE_CODE.CORE_MAINTENANCE, meaning: 'Core Maintenance session' },
      { code: SESSION_TYPE_CODE.ONGOING_MAINTENANCE, meaning: 'Ongoing Maintenance session' },
      { code: SESSION_TYPE_CODE.MAKE_UP_CORE, meaning: 'Make-up session in the Core phase' },
      { code: SESSION_TYPE_CODE.MAKE_UP_CORE_MAINTENANCE, meaning: 'Make-up session in the Core Maintenance phase' },
      { code: SESSION_TYPE_CODE.MAKE_UP_ONGOING_MAINTENANCE, meaning: 'Make-up session in the Ongoing Maintenance phase' },
    ],
  }),
  element(SUBMISSION_COLUMN.SESSION_DATE, 'Session date', 'The actual date of the session, mm/dd/yyyy.'),
  element(SUBMISSION_COLUMN.WEIGHT, "Participant's weight", 'Measured at each session, to the nearest tenth of a pound.', { range: { min: 70, max: 997 }, notReported: NOT_REPORTED.WEIGHT, unit: 'pounds' }),
  element(SUBMISSION_COLUMN.PHYSICAL_ACTIVITY, "Participant's physical activity minutes", 'Moderate or brisk activity since the previous session attended; 0 if none or not tracked.', { range: { min: 0, max: Number.MAX_SAFE_INTEGER }, unit: 'minutes' }),
];

// Finds one element by its column; the dictionary is defined above, so a missing column is a programming error.
export function resolveDataElement(column: string): DataElementDefinition {
  const found = DPRP_DATA_DICTIONARY_2024.find((candidate) => candidate.column === column);
  if (!found) throw new Error(`The 2024 data dictionary has no ${column} element.`);
  return found;
}
