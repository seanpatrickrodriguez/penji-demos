import { COHORT_KIND, DELIVERY_MODE, RESULT_SOURCE } from '@penji-demos/constants';
import { resolveDaysLater, toPlainDate } from '@penji-demos/time';
import {
  CohortRecord,
  Enrollment,
  OrganizationData,
  ParticipantRecord,
  PlainDate,
  SessionRecord,
  toCoachId,
  toCohortId,
  toOrganizationCode,
  toParticipantId,
} from '@penji-demos/types';

// Builders for tests: a readable record with only the parts a test cares about spelled out.

export const ORGANIZATION_CODE = toOrganizationCode('DEMO1');

export function buildCohort(id: string, firstSessionDate: string, kind: CohortRecord['kind'] = COHORT_KIND.GROUP): CohortRecord {
  return { cohortId: toCohortId(id), organizationCode: ORGANIZATION_CODE, kind, firstSessionDate: toPlainDate(firstSessionDate) };
}

// By default: a 52-year-old enrolled on 2025-01-02 with a lab fasting glucose of 112 from December.
export function buildEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    enrollmentDate: toPlainDate('2025-01-02'),
    ageYears: 52,
    heightInches: 66,
    identifiesAsAsian: false,
    a1cPercent: null,
    a1cTestDate: null,
    a1cReportedDate: null,
    fastingGlucoseMgDl: 112,
    fastingGlucoseTestDate: toPlainDate('2024-12-10'),
    oralGlucoseToleranceMgDl: null,
    oralGlucoseToleranceTestDate: null,
    bloodTestSource: RESULT_SOURCE.LAB,
    gestationalDiabetesHistory: false,
    riskTestPositive: false,
    diabetesDiagnosed: false,
    pregnant: false,
    medicarePartB: false,
    endStageRenalDisease: false,
    priorMdpp: false,
    ...overrides,
  };
}

// No blood test on record: eligible for the DPRP only through the risk test or gestational diabetes.
export const NO_BLOOD_TEST: Partial<Enrollment> = {
  fastingGlucoseMgDl: null,
  fastingGlucoseTestDate: null,
  bloodTestSource: null,
};

export function buildSession(sessionDate: PlainDate, weightPounds: number | null, activityMinutes = 0, isMakeUp = false): SessionRecord {
  return { sessionDate, isMakeUp, deliveryMode: DELIVERY_MODE.IN_PERSON, weightPounds, activityMinutes };
}

// Sessions on the given day offsets from a start date, with weight falling evenly from `fromPounds` to `toPounds`.
export function buildSessions(start: string, dayOffsets: readonly number[], fromPounds: number, toPounds: number, activityMinutes = 0): SessionRecord[] {
  const begin = toPlainDate(start);
  const step = dayOffsets.length > 1 ? (fromPounds - toPounds) / (dayOffsets.length - 1) : 0;
  return dayOffsets.map((offset, index) => buildSession(resolveDaysLater(begin, offset), Math.round((fromPounds - step * index) * 10) / 10, activityMinutes));
}

export function buildParticipant(id: string, cohort: CohortRecord, sessions: readonly SessionRecord[], overrides: Partial<Omit<ParticipantRecord, 'participantId' | 'cohortId'>> = {}): ParticipantRecord {
  return {
    participantId: toParticipantId(id),
    cohortId: cohort.cohortId,
    coachId: toCoachId('COACH1'),
    enrollment: buildEnrollment(),
    sessions,
    finalA1c: null,
    ineligibleSince: null,
    ...overrides,
  };
}

// 16 weekly Core sessions, then one a month in months 7-12: the schedule the standard requires an organization to offer.
export const FULL_SCHEDULE: readonly number[] = [...Array.from({ length: 16 }, (_, week) => week * 7), 183, 213, 244, 274, 305, 335];

export function buildOrganization(cohorts: readonly CohortRecord[], participants: readonly ParticipantRecord[], effectiveDate = '2024-01-01'): OrganizationData {
  return {
    organization: { organizationCode: ORGANIZATION_CODE, name: 'Demo organization', deliveryMode: DELIVERY_MODE.IN_PERSON, effectiveDate: toPlainDate(effectiveDate) },
    cohorts,
    participants,
  };
}
