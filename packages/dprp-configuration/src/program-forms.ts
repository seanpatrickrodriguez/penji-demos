import {
  A1C_RESULT_FIELD,
  COHORT_FIELD,
  COHORT_KIND,
  DEFINITION_KIND,
  DELIVERY_MODE,
  ENROLLMENT_FIELD,
  HUB_FIELD,
  INELIGIBILITY_EVENT,
  ORGANIZATION_FIELD,
  PARTICIPANT_FIELD,
  PROGRAM_FORM,
  RECODE_FIELD,
  RESULT_SOURCE,
  SESSION_FIELD,
  STAFF_FIELD,
  STAFF_POSITION,
} from '@penji-demos/constants';
import { FieldDefinition, FormDefinition, toDefinitionId } from '@penji-demos/types';

// M1: the program's own forms.  They collect facts in plain terms and carry
// no standard's codes or limits; every active standard adds its rules to them
// through the compliance engine.

const PLATFORM_SOURCE = { title: 'Penji demos: diabetes prevention program records', url: 'https://github.com/seanpatrickrodriguez/penji-demos' };
const E = ENROLLMENT_FIELD;
const S = SESSION_FIELD;

const answered = (field: string) => ({ kind: 'answered' as const, field });
const isTrue = (field: string) => ({ kind: 'equals' as const, field, value: true });

const DELIVERY_MODE_OPTIONS = [
  { value: DELIVERY_MODE.IN_PERSON, label: 'In person' },
  { value: DELIVERY_MODE.ONLINE, label: 'Online' },
  { value: DELIVERY_MODE.DISTANCE_LEARNING, label: 'Distance learning' },
];

const HUB_FIELDS: readonly FieldDefinition[] = [{ kind: 'text', key: HUB_FIELD.REGION, label: 'Region served', required: true }];

const ORGANIZATION_FIELDS: readonly FieldDefinition[] = [
  { kind: 'text', key: ORGANIZATION_FIELD.CODE, label: 'Organization code', required: true, maxLength: 10 },
  { kind: 'choice', key: ORGANIZATION_FIELD.DELIVERY_MODE, label: 'Delivery mode', required: true, options: DELIVERY_MODE_OPTIONS },
  { kind: 'date', key: ORGANIZATION_FIELD.EFFECTIVE_DATE, label: 'Recognition effective date', required: true },
];

const STAFF_FIELDS: readonly FieldDefinition[] = [
  {
    kind: 'choice',
    key: STAFF_FIELD.POSITION,
    label: 'Position',
    required: true,
    options: [
      { value: STAFF_POSITION.DATA_SPECIALIST, label: 'Data specialist' },
      { value: STAFF_POSITION.LIFESTYLE_COACH, label: 'Lifestyle coach' },
    ],
  },
];

const COHORT_FIELDS: readonly FieldDefinition[] = [
  { kind: 'text', key: COHORT_FIELD.CODE, label: 'Cohort ID', required: true, maxLength: 25 },
  {
    kind: 'choice',
    key: COHORT_FIELD.KIND,
    label: 'Cohort kind',
    required: true,
    options: [
      { value: COHORT_KIND.GROUP, label: 'Group' },
      { value: COHORT_KIND.INDIVIDUAL, label: 'Individual' },
    ],
  },
  { kind: 'date', key: COHORT_FIELD.START_DATE, label: "Cohort's first session", required: true },
];

const ENROLLMENT_FIELDS: readonly FieldDefinition[] = [
  { kind: 'text', key: PARTICIPANT_FIELD.CODE, label: 'Participant ID', required: true, maxLength: 25 },
  { kind: 'text', key: PARTICIPANT_FIELD.COACH_CODE, label: 'Coach ID', required: true, maxLength: 25 },
  { kind: 'date', key: E.ENROLLMENT_DATE, label: 'Enrollment date', required: true },
  { kind: 'number', key: E.AGE_YEARS, label: 'Age at enrollment', required: true, min: 0, max: 125, wholeNumber: true },
  { kind: 'number', key: E.HEIGHT_INCHES, label: 'Height (inches)', required: true, min: 30, max: 98 },
  { kind: 'yesNo', key: E.IDENTIFIES_AS_ASIAN, label: 'Identifies as Asian or Asian American', required: true },
  { kind: 'number', key: E.A1C_PERCENT, label: 'A1C (%)', min: 2.5, max: 18 },
  { kind: 'date', key: E.A1C_TEST_DATE, label: 'A1C test date', showWhen: answered(E.A1C_PERCENT) },
  { kind: 'date', key: E.A1C_REPORTED_DATE, label: 'A1C reported date', showWhen: answered(E.A1C_PERCENT) },
  { kind: 'number', key: E.FASTING_GLUCOSE_MG_DL, label: 'Fasting glucose (mg/dL)', min: 20, max: 600 },
  { kind: 'date', key: E.FASTING_GLUCOSE_TEST_DATE, label: 'Fasting glucose test date', showWhen: answered(E.FASTING_GLUCOSE_MG_DL) },
  { kind: 'number', key: E.ORAL_GLUCOSE_TOLERANCE_MG_DL, label: '2-hour glucose tolerance (mg/dL)', min: 20, max: 600 },
  { kind: 'date', key: E.ORAL_GLUCOSE_TOLERANCE_TEST_DATE, label: 'Glucose tolerance test date', showWhen: answered(E.ORAL_GLUCOSE_TOLERANCE_MG_DL) },
  {
    kind: 'choice',
    key: E.BLOOD_TEST_SOURCE,
    label: 'Blood test results came from',
    options: [
      { value: RESULT_SOURCE.LAB, label: 'A lab report' },
      { value: RESULT_SOURCE.SELF_REPORTED, label: 'The participant' },
    ],
    showWhen: { kind: 'any', conditions: [answered(E.A1C_PERCENT), answered(E.FASTING_GLUCOSE_MG_DL), answered(E.ORAL_GLUCOSE_TOLERANCE_MG_DL)] },
  },
  { kind: 'yesNo', key: E.GESTATIONAL_DIABETES_HISTORY, label: 'Diagnosed with gestational diabetes in a previous pregnancy', required: true },
  { kind: 'yesNo', key: E.RISK_TEST_POSITIVE, label: 'Screened positive on the Prediabetes Risk Test', required: true },
  { kind: 'yesNo', key: E.DIABETES_DIAGNOSED, label: 'Diagnosed with type 1 or type 2 diabetes', required: true },
  { kind: 'yesNo', key: E.PREGNANT, label: 'Pregnant', required: true },
  { kind: 'yesNo', key: E.MEDICARE_PART_B, label: 'Enrolled in Medicare Part B', required: true },
  { kind: 'yesNo', key: E.END_STAGE_RENAL_DISEASE, label: 'Has end-stage renal disease', required: true, showWhen: isTrue(E.MEDICARE_PART_B) },
  { kind: 'yesNo', key: E.PRIOR_MDPP, label: 'Has received Medicare Diabetes Prevention Program services before', required: true, showWhen: isTrue(E.MEDICARE_PART_B) },
];

const SESSION_FIELDS: readonly FieldDefinition[] = [
  { kind: 'date', key: S.SESSION_DATE, label: 'Session date', required: true },
  { kind: 'yesNo', key: S.IS_MAKE_UP, label: 'Make-up session', required: true },
  {
    kind: 'choice',
    key: S.DELIVERY_MODE,
    label: 'Delivered',
    required: true,
    options: DELIVERY_MODE_OPTIONS,
  },
  { kind: 'yesNo', key: S.WEIGHT_REPORTED, label: 'Weight recorded', required: true },
  { kind: 'number', key: S.WEIGHT_POUNDS, label: 'Weight (pounds)', required: true, min: 0, showWhen: isTrue(S.WEIGHT_REPORTED) },
  { kind: 'number', key: S.ACTIVITY_MINUTES, label: 'Activity minutes since the last session', min: 0, wholeNumber: true },
];

const form = (id: string, title: string, description: string, fields: readonly FieldDefinition[]): FormDefinition => ({
  kind: DEFINITION_KIND.FORM,
  id: toDefinitionId(id),
  version: '1',
  title,
  description,
  source: PLATFORM_SOURCE,
  fields,
  rules: [],
});

const A1C_RESULT_FIELDS: readonly FieldDefinition[] = [
  { kind: 'number', key: A1C_RESULT_FIELD.PERCENT, label: 'A1C result (%)', required: true, min: 2.5, max: 18 },
  { kind: 'date', key: A1C_RESULT_FIELD.TEST_DATE, label: 'A1C result test date', required: true },
  { kind: 'date', key: A1C_RESULT_FIELD.REPORTED_DATE, label: 'A1C result reported date', required: true },
];

const RECODE_FIELDS: readonly FieldDefinition[] = [
  {
    kind: 'choice',
    key: RECODE_FIELD.EVENT,
    label: 'No longer eligible because of',
    required: true,
    options: [
      { value: INELIGIBILITY_EVENT.TYPE_2_DIABETES, label: 'A type 2 diabetes diagnosis' },
      { value: INELIGIBILITY_EVENT.PREGNANCY, label: 'A pregnancy' },
    ],
  },
  { kind: 'date', key: RECODE_FIELD.DATE, label: 'Recoded on', required: true },
];

export const HUB_FORM = form(PROGRAM_FORM.HUB, 'Hub', 'An organization that oversees the programs delivering under it.', HUB_FIELDS);
export const ORGANIZATION_FORM = form(PROGRAM_FORM.ORGANIZATION, 'Organization', 'An organization delivering the program.', ORGANIZATION_FIELDS);
export const STAFF_FORM = form(PROGRAM_FORM.STAFF, 'Staff member', 'A person who works the records.', STAFF_FIELDS);
export const COHORT_FORM = form(PROGRAM_FORM.COHORT, 'Cohort', 'Participants who start the program together, or one on their own.', COHORT_FIELDS);
export const ENROLLMENT_FORM = form(PROGRAM_FORM.ENROLLMENT, 'Enrollment', 'The facts gathered when a participant enrolls.', ENROLLMENT_FIELDS);
export const SESSION_FORM = form(PROGRAM_FORM.SESSION, 'Session', 'One session attended by one participant.', SESSION_FIELDS);
export const A1C_RESULT_FORM = form(PROGRAM_FORM.A1C_RESULT, 'A1C result', 'An A1C test reported after enrollment.', A1C_RESULT_FIELDS);
export const RECODE_FORM = form(PROGRAM_FORM.RECODE, 'Recode', 'A participant who stopped being eligible during the program.', RECODE_FIELDS);
