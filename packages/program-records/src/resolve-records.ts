import { DELIVERY_MODE, ENROLLMENT_FIELD, RESULT_SOURCE, SESSION_FIELD } from '@penji-demos/constants';
import { isPlainDate, toPlainDate } from '@penji-demos/time';
import { Answers, DeliveryMode, Enrollment, PlainDate, ResultSource, SessionRecord } from '@penji-demos/types';

// Form answers back into typed records: the inverse of resolveEnrollmentAnswers
// and resolveSessionAnswers.  Each value is read by the type its field holds.

const readNumber = (answers: Answers, key: string): number | null => {
  const value = answers[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const readDate = (answers: Answers, key: string): PlainDate | null => {
  const value = answers[key];
  return typeof value === 'string' && isPlainDate(value) ? toPlainDate(value) : null;
};
const readBoolean = (answers: Answers, key: string, fallback: boolean): boolean => {
  const value = answers[key];
  return typeof value === 'boolean' ? value : fallback;
};

const DELIVERY_MODES: readonly DeliveryMode[] = Object.values(DELIVERY_MODE);
const RESULT_SOURCES: readonly ResultSource[] = Object.values(RESULT_SOURCE);
const isDeliveryMode = (value: unknown): value is DeliveryMode => DELIVERY_MODES.some((mode) => mode === value);
const isResultSource = (value: unknown): value is ResultSource => RESULT_SOURCES.some((source) => source === value);

export function resolveSessionFromAnswers(answers: Answers, previous: SessionRecord | null): SessionRecord | null {
  const sessionDate = readDate(answers, SESSION_FIELD.SESSION_DATE);
  if (!sessionDate) return null;
  const mode = answers[SESSION_FIELD.DELIVERY_MODE];
  const weightReported = readBoolean(answers, SESSION_FIELD.WEIGHT_REPORTED, true);
  return {
    sessionDate,
    isMakeUp: readBoolean(answers, SESSION_FIELD.IS_MAKE_UP, false),
    deliveryMode: isDeliveryMode(mode) ? mode : (previous?.deliveryMode ?? DELIVERY_MODE.IN_PERSON),
    weightPounds: weightReported ? readNumber(answers, SESSION_FIELD.WEIGHT_POUNDS) : null,
    activityMinutes: readNumber(answers, SESSION_FIELD.ACTIVITY_MINUTES) ?? 0,
  };
}

export function resolveEnrollmentFromAnswers(answers: Answers, previous: Enrollment): Enrollment {
  const E = ENROLLMENT_FIELD;
  const source = answers[E.BLOOD_TEST_SOURCE];
  const medicare = readBoolean(answers, E.MEDICARE_PART_B, previous.medicarePartB);
  return {
    enrollmentDate: readDate(answers, E.ENROLLMENT_DATE) ?? previous.enrollmentDate,
    ageYears: readNumber(answers, E.AGE_YEARS) ?? previous.ageYears,
    heightInches: readNumber(answers, E.HEIGHT_INCHES) ?? previous.heightInches,
    identifiesAsAsian: readBoolean(answers, E.IDENTIFIES_AS_ASIAN, previous.identifiesAsAsian),
    a1cPercent: readNumber(answers, E.A1C_PERCENT),
    a1cTestDate: readDate(answers, E.A1C_TEST_DATE),
    a1cReportedDate: readDate(answers, E.A1C_REPORTED_DATE),
    fastingGlucoseMgDl: readNumber(answers, E.FASTING_GLUCOSE_MG_DL),
    fastingGlucoseTestDate: readDate(answers, E.FASTING_GLUCOSE_TEST_DATE),
    oralGlucoseToleranceMgDl: readNumber(answers, E.ORAL_GLUCOSE_TOLERANCE_MG_DL),
    oralGlucoseToleranceTestDate: readDate(answers, E.ORAL_GLUCOSE_TOLERANCE_TEST_DATE),
    bloodTestSource: isResultSource(source) ? source : null,
    gestationalDiabetesHistory: readBoolean(answers, E.GESTATIONAL_DIABETES_HISTORY, previous.gestationalDiabetesHistory),
    riskTestPositive: readBoolean(answers, E.RISK_TEST_POSITIVE, previous.riskTestPositive),
    diabetesDiagnosed: readBoolean(answers, E.DIABETES_DIAGNOSED, previous.diabetesDiagnosed),
    pregnant: readBoolean(answers, E.PREGNANT, previous.pregnant),
    medicarePartB: medicare,
    endStageRenalDisease: medicare && readBoolean(answers, E.END_STAGE_RENAL_DISEASE, previous.endStageRenalDisease),
    priorMdpp: medicare && readBoolean(answers, E.PRIOR_MDPP, previous.priorMdpp),
  };
}
