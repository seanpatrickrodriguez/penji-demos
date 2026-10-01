import { DELIVERY_MODE, RESULT_SOURCE } from '@penji-demos/constants';
import { toPlainDate } from '@penji-demos/time';
import { Enrollment, SessionRecord } from '@penji-demos/types';
import { describe, expect, it } from 'vitest';
import { resolveEnrollmentFromAnswers, resolveSessionFromAnswers } from './resolve-records';
import { resolveEnrollmentAnswers, resolveSessionAnswers } from './resolve-subject';

const ENROLLMENT: Enrollment = {
  enrollmentDate: toPlainDate('2025-01-02'),
  ageYears: 67,
  heightInches: 64,
  identifiesAsAsian: true,
  a1cPercent: 6.1,
  a1cTestDate: toPlainDate('2024-11-20'),
  a1cReportedDate: toPlainDate('2025-01-08'),
  fastingGlucoseMgDl: null,
  fastingGlucoseTestDate: null,
  oralGlucoseToleranceMgDl: null,
  oralGlucoseToleranceTestDate: null,
  bloodTestSource: RESULT_SOURCE.LAB,
  gestationalDiabetesHistory: false,
  riskTestPositive: false,
  diabetesDiagnosed: false,
  pregnant: false,
  medicarePartB: true,
  endStageRenalDisease: false,
  priorMdpp: false,
};

describe('records and form answers', () => {
  it('turns an enrollment into answers and back without loss', () => {
    expect(resolveEnrollmentFromAnswers(resolveEnrollmentAnswers(ENROLLMENT), ENROLLMENT)).toEqual(ENROLLMENT);
  });

  it('turns a session into answers and back, and an unrecorded weight stays unrecorded', () => {
    const session: SessionRecord = { sessionDate: toPlainDate('2025-02-03'), isMakeUp: true, deliveryMode: DELIVERY_MODE.ONLINE, weightPounds: null, activityMinutes: 95 };
    expect(resolveSessionFromAnswers(resolveSessionAnswers(session), null)).toEqual(session);
  });
});
